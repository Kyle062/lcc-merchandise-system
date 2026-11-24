import { Request, Response } from "express";
import db from "../config/db";

const REFUNDABLE_STATUSES = ["Processing", "Ready for Pickup"];

const fail = (status: number, message: string): never => {
  const error: any = new Error(message);
  error.status = status;
  throw error;
};

export const createRefund = async (req: Request, res: Response) => {
  const groupId = Number(req.body.group_id);
  const reason =
    typeof req.body.reason === "string" ? req.body.reason.trim() : "";
  const user: any = (req as any).user;
  const userId = Number(user?.id);
  const isAdmin = user?.role === "admin";

  if (!Number.isInteger(groupId) || groupId < 1) {
    return res.status(400).json({ message: "A valid group_id is required." });
  }

  if (!reason) {
    return res.status(400).json({ message: "A refund reason is required." });
  }

  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(401).json({ message: "User identity is required." });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [groupRows]: any = await conn.query(
      "SELECT id, user_id, group_code, status FROM order_groups WHERE id = ? FOR UPDATE",
      [groupId],
    );

    if (groupRows.length === 0) {
      fail(404, "Order group not found.");
    }

    const group = groupRows[0];

    if (group.status === "Refunded") {
      fail(400, "This order has already been refunded.");
    }

    if (!REFUNDABLE_STATUSES.includes(group.status)) {
      fail(
        400,
        "Refunds are only allowed for Processing or Ready for Pickup orders.",
      );
    }

    if (!isAdmin && Number(group.user_id) !== userId) {
      fail(403, "You can only refund your own orders.");
    }

    const [existingRefunds]: any = await conn.query(
      "SELECT id FROM refunds WHERE group_id = ? LIMIT 1",
      [groupId],
    );

    if (existingRefunds.length > 0) {
      fail(400, "A refund has already been recorded for this order.");
    }

    const [items]: any = await conn.query(
      `SELECT id, product_id, quantity, total_price
       FROM orders
       WHERE group_id = ?
       FOR UPDATE`,
      [groupId],
    );

    if (items.length === 0) {
      fail(400, "No order items found for this group.");
    }

    let amount = 0;

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        fail(400, "Invalid order item data.");
      }

      const [productRows]: any = await conn.query(
        "SELECT id FROM products WHERE id = ? FOR UPDATE",
        [productId],
      );

      if (productRows.length === 0) {
        fail(404, `Product ${productId} was not found.`);
      }

      amount += Number(item.total_price) || 0;

      await conn.query(
        "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
        [quantity, productId],
      );
    }

    amount = Number(amount.toFixed(2));

    await conn.query(
      "UPDATE orders SET status = 'Refunded' WHERE group_id = ?",
      [groupId],
    );
    await conn.query(
      "UPDATE order_groups SET status = 'Refunded' WHERE id = ?",
      [groupId],
    );

    const [refundResult]: any = await conn.query(
      `INSERT INTO refunds (group_id, user_id, admin_id, amount, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [groupId, group.user_id, isAdmin ? userId : null, amount, reason],
    );

    await conn.commit();

    res.status(201).json({
      message: "Refund issued successfully.",
      refundId: refundResult.insertId,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("createRefund error:", error.message);
    res.status(error.status || 500).json({
      message: error.message || "Error processing refund",
      ...(error.status ? {} : { details: error.message }),
    });
  } finally {
    conn.release();
  }
};

export const getRefunds = async (req: Request, res: Response) => {
  const user: any = (req as any).user;
  const role = user?.role;

  if (role !== "admin" && role !== "student") {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const params: any[] = [];
    let where = "";

    if (role === "student") {
      where = "WHERE r.user_id = ?";
      params.push(user.id);
    }

    const [rows]: any = await db.query(
      `SELECT
         r.id,
         r.group_id,
         r.user_id,
         r.admin_id,
         r.amount,
         r.reason,
         r.refunded_at,
         u.full_name,
         g.group_code
       FROM refunds r
       JOIN users u ON r.user_id = u.id
       JOIN order_groups g ON r.group_id = g.id
       ${where}
       ORDER BY r.refunded_at DESC, r.id DESC`,
      params,
    );

    res.json(
      rows.map((row: any) => ({
        ...row,
        amount: Number(row.amount),
      })),
    );
  } catch (error: any) {
    console.error("getRefunds error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching refunds", details: error.message });
  }
};
