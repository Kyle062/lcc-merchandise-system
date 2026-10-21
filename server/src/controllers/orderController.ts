import { Request, Response } from 'express';
import db from '../config/db';

// GET all orders (Admin)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date, o.group_id,
        p.id AS product_id, p.name AS product_name, p.course AS product_course, p.size AS product_size,
        u.id AS user_id, u.username, u.full_name, u.email
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching orders', details: error.message });
  }
};

// ✅ ADDED BACK: GET single order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
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
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'Order not found' });
    res.json(rows[0]);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching order', details: error.message });
  }
};

// GET orders for current student (Grouped by Group ID)
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const [rows] = await db.query(`
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date, o.group_id,
        p.name AS product_name, p.size AS product_size
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.order_date DESC
    `, [userId]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching orders', details: error.message });
  }
};

// PLACE MULTIPLE ORDERS (Now grouped under one Group ID)
export const placeOrder = async (req: Request, res: Response) => {
  const { items } = req.body; 
  const user_id = (req as any).user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  const conn = await (await import('../config/db')).default.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Create the Order Group FIRST
    const groupCode = `GRP-${Date.now()}`;
    const [groupResult]: any = await conn.query(
      'INSERT INTO order_groups (user_id, group_code, status) VALUES (?, ?, ?)',
      [user_id, groupCode, 'Pending']
    );
    const groupId = groupResult.insertId;

    // 2. Insert all items linked to this Group ID
    for (const item of items) {
      const { product_id, quantity } = item;

      const [productRows]: any = await conn.query('SELECT * FROM products WHERE id = ?', [product_id]);
      if (productRows.length === 0) throw new Error(`Product not found`);
      
      const product = productRows[0];
      if (product.stock_quantity < quantity) throw new Error(`Insufficient stock for ${product.name}`);

      const total_price = product.price * quantity;

      await conn.query(
        'INSERT INTO orders (group_id, user_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)',
        [groupId, user_id, product_id, quantity, total_price, 'Pending']
      );
    }

    await conn.commit();
    res.status(201).json({ message: 'Order placed', groupId });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ message: error.message || 'Error placing order' });
  } finally {
    conn.release();
  }
};

// SCAN GROUP QR (Admin)
export const scanOrderQR = async (req: Request, res: Response) => {
  const { group_id } = req.body; 
  
  const conn = await (await import('../config/db')).default.getConnection();

  try {
    await conn.beginTransaction();

    const [groupRows]: any = await conn.query('SELECT * FROM order_groups WHERE id = ?', [group_id]);
    if (groupRows.length === 0) throw new Error('Order Group not found');
    
    const group = groupRows[0];
    if (group.status !== 'Pending') throw new Error(`Order is already ${group.status}`);

    const [orderRows]: any = await conn.query('SELECT * FROM orders WHERE group_id = ?', [group_id]);

    for (const order of orderRows) {
      const [productRows]: any = await conn.query('SELECT stock_quantity, name FROM products WHERE id = ?', [order.product_id]);
      if (productRows[0].stock_quantity < order.quantity) {
        throw new Error(`Insufficient stock for ${productRows[0].name}`);
      }
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [order.quantity, order.product_id]);
    }

    await conn.query('UPDATE order_groups SET status = "Processing" WHERE id = ?', [group_id]);
    await conn.query('UPDATE orders SET status = "Processing" WHERE group_id = ?', [group_id]);

    await conn.commit();
    res.json({ message: 'Bulk order scanned successfully. All items are now Processing.' });
  } catch (error: any) {
    await conn.rollback();
    res.status(400).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// DELETE PENDING GROUP (Student)
export const deleteMyPendingOrder = async (req: Request, res: Response) => {
  const { id } = req.params; 
  const userId = (req as any).user.id;

  try {
    const [groupRows]: any = await db.query('SELECT * FROM order_groups WHERE id = ? AND user_id = ?', [id, userId]);
    if (groupRows.length === 0) return res.status(404).json({ message: 'Order not found' });
    if (groupRows[0].status !== 'Pending') return res.status(400).json({ message: 'Cannot delete processed orders.' });

    await db.query('DELETE FROM order_groups WHERE id = ?', [id]); 
    res.json({ message: 'Pending order cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting order', details: error.message });
  }
};

// UPDATE ORDER STATUS (Admin dropdown)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params;
  try {
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Status updated' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating status' });
  }
};

export const deleteOrder = async (req: Request, res: Response) => {
  try {
    await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Order deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error deleting order' });
  }
};