import { Request, Response } from "express";
import db from "../config/db";

// GET all orders (with student + product info) - Admin & Staff
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id,
        o.quantity,
        o.total_price,
        o.status,
        o.order_date,
        p.id AS product_id,
        p.name AS product_name,
        p.course AS product_course,
        p.size AS product_size,
        u.id AS user_id,
        u.username,
        u.full_name,
        u.email
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC
    `);
    res.json(rows);
  } catch (error: any) {
    console.error("getAllOrders error:", error.message);
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
    res
      .status(500)
      .json({ message: "Error fetching order", details: error.message });
  }
};

// GET orders for current logged-in student
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const [rows] = await db.query(
      `
      SELECT 
        o.*,
        p.name AS product_name,
        p.course AS product_course,
        p.size AS product_size
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.order_date DESC
    `,
      [userId],
    );
    res.json(rows);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching orders", details: error.message });
  }
};

// PLACE MULTIPLE ORDERS (Cart Checkout)
export const placeOrder = async (req: Request, res: Response) => {
  const { items } = req.body; // Expecting an array: [{ product_id: 1, quantity: 2 }, ...]
  const user_id = (req as any).user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const conn = await (await import("../config/db")).default.getConnection();

  try {
    await conn.beginTransaction();
    let totalOrderAmount = 0;
    const orderIds = [];

    // Loop through each item in the cart
    for (const item of items) {
      const { product_id, quantity } = item;

      // 1. Check stock for this item
      const [productRows]: any = await conn.query(
        "SELECT * FROM products WHERE id = ?",
        [product_id],
      );

      if (productRows.length === 0) {
        await conn.rollback();
        return res
          .status(404)
          .json({ message: `Product ID ${product_id} not found` });
      }

      const product = productRows[0];

      if (product.stock_quantity < quantity) {
        await conn.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Only ${product.stock_quantity} available.`,
        });
      }

      const total_price = product.price * quantity;
      totalOrderAmount += total_price;

      // 2. Create the order row for this item
      const [result]: any = await conn.query(
        "INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?)",
        [user_id, product_id, quantity, total_price, "Pending"],
      );

      orderIds.push(result.insertId);
    }

    await conn.commit();
    res.status(201).json({
      message: "Orders placed successfully",
      orderIds: orderIds,
      total: totalOrderAmount,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("❌ placeOrder error:", error.message);
    res
      .status(500)
      .json({ message: "Error placing order", details: error.message });
  } finally {
    conn.release();
  }
};

// UPDATE ORDER STATUS (staff/admin) — deducts stock when moving to Processing
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params;

  const validStatuses = [
    "Pending",
    "Processing",
    "Ready for Pickup",
    "Completed",
    "Cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const conn = await (await import("../config/db")).default.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Get current order
    const [orderRows]: any = await conn.query(
      "SELECT * FROM orders WHERE id = ?",
      [id],
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orderRows[0];
    const oldStatus = order.status;

    // 2. Handle stock deduction/restoration based on status change
    if (oldStatus !== "Processing" && status === "Processing") {
      // Moving INTO Processing → deduct stock
      const [productRows]: any = await conn.query(
        "SELECT stock_quantity FROM products WHERE id = ?",
        [order.product_id],
      );

      if (productRows[0].stock_quantity < order.quantity) {
        await conn.rollback();
        return res.status(400).json({
          message: `Cannot process. Only ${productRows[0].stock_quantity} in stock.`,
        });
      }

      await conn.query(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
        [order.quantity, order.product_id],
      );
    }

    if (oldStatus === "Processing" && status === "Cancelled") {
      // Cancel from Processing → restore stock
      await conn.query(
        "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?",
        [order.quantity, order.product_id],
      );
    }

    // 3. Update order status
    await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);

    await conn.commit();
    res.json({ message: "Order status updated", oldStatus, newStatus: status });
  } catch (error: any) {
    await conn.rollback();
    console.error(" updateOrderStatus error:", error.message);
    res
      .status(500)
      .json({ message: "Error updating status", details: error.message });
  } finally {
    conn.release();
  }
};

// DELETE ORDER (admin only)
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    await db.query("DELETE FROM orders WHERE id = ?", [req.params.id]);
    res.json({ message: "Order deleted" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error deleting order", details: error.message });
  }
};

// DELETE PENDING ORDER (student only)
export const deleteMyPendingOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  try {

    const [orderRows]: any = await db.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orderRows[0];


    if (order.status !== 'Pending') {
      return res.status(400).json({ message: 'Cannot delete an order that has already been scanned/processed.' });
    }

    await db.query('DELETE FROM orders WHERE id = ?', [id]);

    res.json({ message: 'Pending order cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting order', details: error.message });
  }
};