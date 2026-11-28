import { Request, Response } from 'express';
import db from '../config/db';
import {
  buildDateClause,
  parseExportFormat,
  parseList,
  resolvePeriod,
  sendTabularExport,
  toFileToken,
} from '../utils/queryUtils';

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

// EXPORT: Orders summary as CSV or Excel-compatible XLS
export const exportOrdersCSV = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || '').trim();
    const statuses = parseList(req.query.status);
    const courses = parseList(req.query.course).filter((course) => course !== 'All');
    const period = resolvePeriod(req.query as Record<string, any>);
    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ` AND (g.group_code LIKE ? OR u.full_name LIKE ? OR u.username LIKE ? OR p.name LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (statuses.length > 0) {
      where += ` AND g.status IN (${statuses.map(() => '?').join(',')})`;
      params.push(...statuses);
    }
    if (courses.length > 0) {
      where += ` AND COALESCE(NULLIF(u.course, ''), p.course) IN (${courses.map(() => '?').join(',')})`;
      params.push(...courses);
    }
    where += buildDateClause('g.created_at', period, params);

    const [rows]: any = await db.query(
      `SELECT g.group_code, g.status AS group_status, o.id AS order_id,
              u.username, u.full_name, COALESCE(NULLIF(u.course, ''), p.course) AS course,
              p.name AS product, p.size, o.quantity, o.total_price, o.order_date
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users u ON o.user_id = u.id
       JOIN order_groups g ON o.group_id = g.id
       ${where}
       ORDER BY g.created_at DESC`,
      params,
    );

    const headers = ['Group Code', 'Group Status', 'Order ID', 'Username', 'Full Name', 'Course', 'Product', 'Size', 'Quantity', 'Total Price', 'Order Date'];
    const dataRows = rows.map((row: any) => [
      row.group_code,
      row.group_status,
      row.order_id,
      row.username,
      row.full_name || '',
      row.course || '',
      row.product,
      row.size || '',
      row.quantity,
      Number(row.total_price).toFixed(2),
      row.order_date,
    ]);
    return sendTabularExport(
      res,
      `orders_${toFileToken(period.label)}_${Date.now()}`,
      headers,
      dataRows,
      parseExportFormat(req.query.format),
    );
  } catch (error: any) {
    res.status(500).json({ message: 'Error exporting orders', details: error.message });
  }
};

// EXPORT: Inventory snapshot as CSV or Excel-compatible XLS
export const exportInventory = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || '').trim();
    const courses = parseList(req.query.course).filter((course) => course !== 'All');
    const stockState = String(req.query.stock_state || 'all');
    const params: any[] = [];
    let where = 'WHERE 1=1';

    if (search) {
      where += ` AND (name LIKE ? OR description LIKE ? OR size LIKE ? OR course LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (courses.length > 0) {
      where += ` AND course IN (${courses.map(() => '?').join(',')})`;
      params.push(...courses);
    }
    if (stockState === 'low') where += ' AND stock_quantity < 10';
    if (stockState === 'out') where += ' AND stock_quantity = 0';
    if (stockState === 'in') where += ' AND stock_quantity >= 10';

    const [rows]: any = await db.query(
      `SELECT id, name, course, description, size, price, stock_quantity,
              CASE WHEN stock_quantity = 0 THEN 'Out of Stock'
                   WHEN stock_quantity < 10 THEN 'Low Stock'
                   ELSE 'In Stock' END AS stock_status
       FROM products ${where}
       ORDER BY course ASC, name ASC`,
      params,
    );

    const headers = ['Product ID', 'Product Name', 'Course', 'Description', 'Size', 'Price', 'Stock', 'Stock Status'];
    const dataRows = rows.map((row: any) => [
      row.id,
      row.name,
      row.course || '',
      row.description || '',
      row.size || '',
      Number(row.price).toFixed(2),
      row.stock_quantity,
      row.stock_status,
    ]);
    return sendTabularExport(
      res,
      `inventory_${Date.now()}`,
      headers,
      dataRows,
      parseExportFormat(req.query.format),
    );
  } catch (error: any) {
    res.status(500).json({ message: 'Error exporting inventory', details: error.message });
  }
};

// EXPORT: Date-scoped sales summary as CSV or Excel-compatible XLS
export const exportSales = async (req: Request, res: Response) => {
  try {
    const period = resolvePeriod(req.query as Record<string, any>);
    const params: any[] = [];
    const dateFilter = buildDateClause('g.created_at', period, params);
    const [rows]: any = await db.query(
      `SELECT DATE(g.created_at) AS sale_date,
              COALESCE(NULLIF(u.course, ''), p.course) AS course,
              p.name AS product,
              SUM(o.quantity) AS quantity,
              SUM(o.total_price) AS revenue,
              g.status AS status
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN users u ON o.user_id = u.id
       JOIN order_groups g ON o.group_id = g.id
       WHERE 1=1 ${dateFilter}
       GROUP BY DATE(g.created_at), course, p.name, g.status
       ORDER BY sale_date DESC, course ASC`,
      params,
    );

    const headers = ['Date', 'Course', 'Product', 'Quantity', 'Revenue', 'Status'];
    const dataRows = rows.map((row: any) => [
      row.sale_date,
      row.course || '',
      row.product,
      row.quantity,
      Number(row.revenue).toFixed(2),
      row.status,
    ]);
    return sendTabularExport(
      res,
      `sales_summary_${toFileToken(period.label)}_${Date.now()}`,
      headers,
      dataRows,
      parseExportFormat(req.query.format),
    );
  } catch (error: any) {
    res.status(500).json({ message: 'Error exporting sales', details: error.message });
  }
};