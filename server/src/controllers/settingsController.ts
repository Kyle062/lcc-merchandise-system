import { Request, Response } from 'express';
import db from '../config/db';

// GET all settings (returns as key-value object)
export const getSettings = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query('SELECT setting_key, setting_value FROM settings');
    const settings: any = {};
    rows.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching settings', details: error.message });
  }
};

// GET single setting by key
export const getSetting = async (key: string) => {
  const [rows]: any = await db.query(
    'SELECT setting_value FROM settings WHERE setting_key = ?',
    [key]
  );
  return rows[0]?.setting_value ?? null;
};

// UPDATE settings (bulk update)
export const updateSettings = async (req: Request, res: Response) => {
  const updates = req.body;

  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ message: 'Invalid settings payload' });
  }

  const conn = await (await import('../config/db')).default.getConnection();

  try {
    await conn.beginTransaction();

    for (const [key, value] of Object.entries(updates)) {
      await conn.query(
        `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(value)]
      );
    }

    await conn.commit();
    res.json({ message: 'Settings updated successfully' });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ message: 'Error updating settings', details: error.message });
  } finally {
    conn.release();
  }
};

// DANGER ZONE: Clear all cancelled orders
export const clearCancelledOrders = async (req: Request, res: Response) => {
  try {
    const [result]: any = await db.query(`DELETE FROM orders WHERE status = 'Cancelled'`);
    res.json({ message: 'Cancelled orders cleared', count: result.affectedRows });
  } catch (error: any) {
    res.status(500).json({ message: 'Error clearing orders', details: error.message });
  }
};

// DANGER ZONE: Reset order auto-increment counter
export const resetOrderCounter = async (req: Request, res: Response) => {
  try {
    await db.query('ALTER TABLE orders AUTO_INCREMENT = 1');
    res.json({ message: 'Order counter reset' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error resetting counter', details: error.message });
  }
};

// SYSTEM INFO: Get system stats
export const getSystemInfo = async (req: Request, res: Response) => {
  try {
    const [users]: any = await db.query('SELECT COUNT(*) as count FROM users');
    const [products]: any = await db.query('SELECT COUNT(*) as count FROM products');
    const [orders]: any = await db.query('SELECT COUNT(*) as count FROM orders');
    const [pending]: any = await db.query(`SELECT COUNT(*) as count FROM users WHERE status = 'Pending'`);

    res.json({
      totalUsers: users[0].count,
      totalProducts: products[0].count,
      totalOrders: orders[0].count,
      pendingApprovals: pending[0].count,
      databaseStatus: 'Connected',
      lastBackup: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching system info', details: error.message });
  }
};

// EXPORT: Download all orders as CSV
export const exportOrdersCSV = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        o.id AS order_id,
        u.username,
        u.full_name,
        p.name AS product,
        p.course,
        o.quantity,
        o.total_price,
        o.status,
        o.order_date
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC
    `);

    const headers = ['Order ID', 'Username', 'Full Name', 'Product', 'Course', 'Quantity', 'Total Price', 'Status', 'Order Date'];
    const csvRows = [headers.join(',')];

    rows.forEach((row: any) => {
      const values = [
        row.order_id,
        `"${row.username}"`,
        `"${row.full_name || ''}"`,
        `"${row.product}"`,
        `"${row.course || ''}"`,
        row.quantity,
        row.total_price,
        row.status,
        row.order_date,
      ];
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ message: 'Error exporting orders', details: error.message });
  }
};