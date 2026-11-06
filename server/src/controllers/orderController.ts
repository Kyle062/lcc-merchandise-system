import { Request, Response } from "express";
import db from "../config/db";

// GET all orders (Admin)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date, o.group_id,
        p.id AS product_id, p.name AS product_name, p.course AS product_course, p.size AS product_size,
        u.id AS user_id, u.username, u.full_name, u.email, u.course AS user_course
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC
    `);
    res.json(rows);
  } catch (error: any) {
    console.error("❌ getAllOrders error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching orders", details: error.message });
  }
};

// GET single order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(
      `
      SELECT 
        o.*,
        p.name AS product_name,
        p.course AS product_course,
        p.price AS product_price,
        p.size AS product_size,
        u.username,
        u.full_name,
        u.email
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `,
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Order not found" });
    res.json(rows[0]);
  } catch (error: any) {
    console.error("❌ getOrderById error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching order", details: error.message });
  }
};

// GET orders for current student (Grouped by Group ID)
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const [rows] = await db.query(
      `
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date, o.group_id,
        p.name AS product_name, p.size AS product_size
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.order_date DESC
    `,
      [userId],
    );
    res.json(rows);
  } catch (error: any) {
    console.error("❌ getMyOrders error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching orders", details: error.message });
  }
};

// PLACE MULTIPLE ORDERS
export const placeOrder = async (req: Request, res: Response) => {
  const { items } = req.body;
  const user_id = (req as any).user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();
    const groupCode = `GRP-${Date.now()}`;
    const [groupResult]: any = await conn.query(
      "INSERT INTO order_groups (user_id, group_code, status) VALUES (?, ?, ?)",
      [user_id, groupCode, "Pending"],
    );
    const groupId = groupResult.insertId;

    for (const item of items) {
      const { product_id, quantity } = item;
      const [productRows]: any = await conn.query(
        "SELECT * FROM products WHERE id = ?",
        [product_id],
      );
      if (productRows.length === 0) throw new Error(`Product not found`);

      const product = productRows[0];
      if (product.stock_quantity < quantity)
        throw new Error(`Insufficient stock for ${product.name}`);

      const total_price = product.price * quantity;
      await conn.query(
        "INSERT INTO orders (group_id, user_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
        [groupId, user_id, product_id, quantity, total_price, "Pending"],
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Order placed", groupId });
  } catch (error: any) {
    await conn.rollback();
    console.error("❌ placeOrder error:", error.message);
    res.status(500).json({ message: error.message || "Error placing order" });
  } finally {
    conn.release();
  }
};

// 1. NEW: Scan Preview (Gets group details for the modal before confirming)
export const getScanPreview = async (req: Request, res: Response) => {
  const { group_id } = req.body;
  try {
    const [groupRows]: any = await db.query(
      "SELECT * FROM order_groups WHERE id = ?",
      [group_id],
    );
    if (groupRows.length === 0)
      return res.status(404).json({ message: "Order Group not found." });
    if (groupRows[0].status !== "Pending")
      return res
        .status(400)
        .json({ message: `This order is already "${groupRows[0].status}".` });

    const [items]: any = await db.query(
      `
      SELECT o.id, o.product_id, o.quantity, o.total_price, p.name, p.size, p.price
      FROM orders o JOIN products p ON o.product_id = p.id
      WHERE o.group_id = ?
    `,
      [group_id],
    );

    const [userRows]: any = await db.query(
      "SELECT full_name, course FROM users WHERE id = ?",
      [groupRows[0].user_id],
    );

    res.json({
      group: groupRows[0],
      user: userRows[0] || { full_name: "Unknown" },
      items,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching preview", details: error.message });
  }
};

// 2. NEW: Confirm Scan (Admin clicks Confirm on the Modal)
export const confirmScanOrder = async (req: Request, res: Response) => {
  const { group_id, items } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Deduct stock & update individual order items based on what Admin edited
    for (const item of items) {
      const [productRows]: any = await conn.query(
        "SELECT stock_quantity, name FROM products WHERE id = ?",
        [item.product_id],
      );
      if (productRows.length === 0) throw new Error(`Product not found.`);
      if (productRows[0].stock_quantity < item.quantity)
        throw new Error(`Not enough stock for ${productRows[0].name}.`);

      await conn.query(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
        [item.quantity, item.product_id],
      );
      await conn.query(
        "UPDATE orders SET quantity = ?, total_price = ?, status = 'Processing' WHERE id = ?",
        [item.quantity, item.total_price, item.id],
      );
    }

    await conn.query(
      'UPDATE order_groups SET status = "Processing" WHERE id = ?',
      [group_id],
    );

    await conn.commit();
    res.json({ message: "Order processed and stock updated successfully." });
  } catch (error: any) {
    await conn.rollback();
    res
      .status(500)
      .json({ message: error.message || "Server error during confirmation" });
  } finally {
    conn.release();
  }
};

// 3. FIXED: Update whole Group Status (Admin dropdown)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params; // This 'id' is now the group_id from the frontend
  try {
    await db.query("UPDATE order_groups SET status = ? WHERE id = ?", [
      status,
      id,
    ]);
    await db.query("UPDATE orders SET status = ? WHERE group_id = ?", [
      status,
      id,
    ]);
    res.json({ message: "Status updated" });
  } catch (error: any) {
    console.error("❌ updateOrderStatus error:", error.message);
    res.status(500).json({ message: "Error updating status" });
  }
};

// 4. FIXED: Delete whole Group (Admin)
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    // Assuming the frontend sends group_id. We delete the group, which cascades to orders.
    await db.query("DELETE FROM order_groups WHERE id = ?", [req.params.id]);
    res.json({ message: "Order group deleted" });
  } catch (error: any) {
    console.error("❌ deleteOrder error:", error.message);
    res.status(500).json({ message: "Error deleting order" });
  }
};

// 5. Student Delete (Only if Pending)
export const deleteMyPendingOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  try {
    const [groupRows]: any = await db.query(
      "SELECT * FROM order_groups WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    if (groupRows.length === 0)
      return res.status(404).json({ message: "Order not found" });
    if (groupRows[0].status !== "Pending")
      return res
        .status(400)
        .json({ message: "Cannot delete processed orders." });

    await db.query("DELETE FROM order_groups WHERE id = ?", [id]);
    res.json({ message: "Pending order cancelled successfully" });
  } catch (error: any) {
    console.error("❌ deleteMyPendingOrder error:", error.message);
    res
      .status(500)
      .json({ message: "Error deleting order", details: error.message });
  }
};
