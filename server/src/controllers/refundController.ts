import { Request, Response } from "express";
import db from "../config/db";

const REFUNDABLE_STATUSES = ["Processing", "Ready for Pickup"];
const INVALID_STATUS_MESSAGE =
  "Refunds are only allowed for Processing or Ready for Pickup orders.";

const fail = (status: number, message: string): never => {
  const error: any = new Error(message);
  error.status = status;
  throw error;
};

const REFUND_SELECT = `
  SELECT
    r.id,
    r.group_id,
    r.user_id,
    r.admin_id,
    r.amount,
    r.reason,
    r.status,
    r.reviewed_by,
    r.reviewed_at,
    r.rejection_reason,
    r.refunded_at,
    u.full_name AS student_name,
    g.group_code,
    reviewer.full_name AS reviewed_by_name
  FROM refunds r
  JOIN users u ON r.user_id = u.id
  JOIN order_groups g ON r.group_id = g.id
  LEFT JOIN users reviewer ON r.reviewed_by = reviewer.id
`;

const applyRefundToOrder = async (conn: any, groupId: number) => {
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

  await conn.query(
    "UPDATE orders SET status = 'Refunded' WHERE group_id = ?",
    [groupId],
  );
  await conn.query(
    "UPDATE order_groups SET status = 'Refunded' WHERE id = ?",
    [groupId],
  );

  return Number(amount.toFixed(2));
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
      fail(400, INVALID_STATUS_MESSAGE);
    }

    if (!isAdmin && Number(group.user_id) !== userId) {
      fail(403, "You can only refund your own orders.");
    }

    const [existingRefunds]: any = await conn.query(
      "SELECT id, status FROM refunds WHERE group_id = ? ORDER BY id DESC LIMIT 1",
      [groupId],
    );

    const existing = existingRefunds[0];

    if (existing?.status === "pending") {
      fail(400, "A refund request is already pending admin approval.");
    }

    if (existing?.status === "approved") {
      fail(400, "This order has already been refunded.");
    }

    if (existing?.status === "rejected") {
      // A rejected request can be submitted again with a new reason.
      await conn.query("DELETE FROM refunds WHERE id = ?", [existing.id]);
    }

    const [itemRows]: any = await conn.query(
      `SELECT quantity, total_price FROM orders WHERE group_id = ?`,
      [groupId],
    );

    if (itemRows.length === 0) {
      fail(400, "No order items found for this group.");
    }

    const amount = Number(
      itemRows
        .reduce((sum: number, item: any) => sum + (Number(item.total_price) || 0), 0)
        .toFixed(2),
    );

    // Ready-for-pickup requests made by a student must be reviewed by an admin.
    const needsApproval = !isAdmin && group.status === "Ready for Pickup";

    let refundId: number;

    if (needsApproval) {
      const [result]: any = await conn.query(
        `INSERT INTO refunds (group_id, user_id, admin_id, amount, reason, status)
         VALUES (?, ?, NULL, ?, ?, 'pending')`,
        [groupId, group.user_id, amount, reason],
      );
      refundId = result.insertId;
    } else {
      await applyRefundToOrder(conn, groupId);

      const [result]: any = await conn.query(
        `INSERT INTO refunds
           (group_id, user_id, admin_id, amount, reason, status, reviewed_by, reviewed_at)
         VALUES (?, ?, ?, ?, ?, 'approved', ?, NOW())`,
        [
          groupId,
          group.user_id,
          isAdmin ? userId : null,
          amount,
          reason,
          isAdmin ? userId : null,
        ],
      );
      refundId = result.insertId;
    }

    await conn.commit();

    res.status(201).json({
      message: needsApproval
        ? "Refund request submitted for admin approval."
        : "Refund issued successfully.",
      refundId,
      status: needsApproval ? "pending" : "approved",
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
      `${REFUND_SELECT}
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

export const getRefundById = async (req: Request, res: Response) => {
  const user: any = (req as any).user;
  const refundId = Number(req.params.id);

  if (!Number.isInteger(refundId) || refundId < 1) {
    return res.status(400).json({ message: "A valid refund id is required." });
  }

  try {
    const params: any[] = [refundId];
    let userFilter = "";

    if (user?.role !== "admin") {
      userFilter = " AND r.user_id = ?";
      params.push(user?.id);
    }

    const [rows]: any = await db.query(
      `${REFUND_SELECT} WHERE r.id = ?${userFilter}`,
      params,
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Refund not found." });
    }

    res.json({ ...rows[0], amount: Number(rows[0].amount) });
  } catch (error: any) {
    console.error("getRefundById error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching refund", details: error.message });
  }
};

export const approveRefund = async (req: Request, res: Response) => {
  const refundId = Number(req.params.id);
  const user: any = (req as any).user;
  const adminId = Number(user?.id);

  if (!Number.isInteger(refundId) || refundId < 1) {
    return res.status(400).json({ message: "A valid refund id is required." });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [refundRows]: any = await conn.query(
      "SELECT id, group_id, status FROM refunds WHERE id = ? FOR UPDATE",
      [refundId],
    );

    if (refundRows.length === 0) {
      fail(404, "Refund request not found.");
    }

    const refund = refundRows[0];

    if (refund.status !== "pending") {
      fail(400, "This refund request has already been reviewed.");
    }

    const [groupRows]: any = await conn.query(
      "SELECT id, status FROM order_groups WHERE id = ? FOR UPDATE",
      [refund.group_id],
    );

    if (groupRows.length === 0) {
      fail(404, "Order group not found.");
    }

    if (!REFUNDABLE_STATUSES.includes(groupRows[0].status)) {
      fail(400, INVALID_STATUS_MESSAGE);
    }

    await applyRefundToOrder(conn, Number(refund.group_id));

    await conn.query(
      `UPDATE refunds
       SET status = 'approved', admin_id = ?, reviewed_by = ?, reviewed_at = NOW(),
           refunded_at = NOW(), rejection_reason = NULL
       WHERE id = ?`,
      [adminId, adminId, refundId],
    );

    await conn.commit();

    res.json({
      message: "Refund approved successfully.",
      refundId,
      status: "approved",
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("approveRefund error:", error.message);
    res.status(error.status || 500).json({
      message: error.message || "Error approving refund",
      ...(error.status ? {} : { details: error.message }),
    });
  } finally {
    conn.release();
  }
};

export const rejectRefund = async (req: Request, res: Response) => {
  const refundId = Number(req.params.id);
  const user: any = (req as any).user;
  const adminId = Number(user?.id);
  const rejectionReason =
    typeof req.body?.rejection_reason === "string"
      ? req.body.rejection_reason.trim().slice(0, 255)
      : "";

  if (!Number.isInteger(refundId) || refundId < 1) {
    return res.status(400).json({ message: "A valid refund id is required." });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [refundRows]: any = await conn.query(
      "SELECT id, status FROM refunds WHERE id = ? FOR UPDATE",
      [refundId],
    );

    if (refundRows.length === 0) {
      fail(404, "Refund request not found.");
    }

    if (refundRows[0].status !== "pending") {
      fail(400, "This refund request has already been reviewed.");
    }

    await conn.query(
      `UPDATE refunds
       SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(),
           rejection_reason = ?
       WHERE id = ?`,
      [adminId, rejectionReason || null, refundId],
    );

    await conn.commit();

    res.json({
      message: "Refund request rejected. The order remains active.",
      refundId,
      status: "rejected",
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("rejectRefund error:", error.message);
    res.status(error.status || 500).json({
      message: error.message || "Error rejecting refund",
      ...(error.status ? {} : { details: error.message }),
    });
  } finally {
    conn.release();
  }
};
