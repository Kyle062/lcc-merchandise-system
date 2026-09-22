import { Request, Response } from 'express';
import db from '../config/db';

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [salesResult]: any = await db.query(
      'SELECT COALESCE(SUM(total_price), 0) as totalSales FROM orders'
    );
    const [ordersResult]: any = await db.query(
      'SELECT COUNT(*) as totalOrders FROM orders'
    );
    const [pendingResult]: any = await db.query(
      'SELECT COUNT(*) as pendingOrders FROM orders WHERE status = ?',
      ['Pending']
    );
    const [lowStockResult]: any = await db.query(
      'SELECT COUNT(*) as lowStock FROM products WHERE stock_quantity < 10'
    );

    res.json({
      totalSales: salesResult[0].totalSales,
      totalOrders: ordersResult[0].totalOrders,
      pendingOrders: pendingResult[0].pendingOrders,
      lowStock: lowStockResult[0].lowStock,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching stats', details: error.message });
  }
};

export const getRecentOrders = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date,
        p.name AS product_name,
        u.username, u.full_name
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      ORDER BY o.order_date DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching orders', details: error.message });
  }
};

export const getMonthlySales = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        DATE_FORMAT(order_date, '%b') AS month,
        COALESCE(SUM(total_price), 0) AS sales,
        COUNT(*) AS orders
      FROM orders
      WHERE order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(order_date, '%b'), MONTH(order_date)
      ORDER BY MONTH(order_date)
    `);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching monthly sales', details: error.message });
  }
};

export const getInventoryDistribution = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
      SELECT p.name AS name, SUM(o.quantity) AS value
      FROM orders o
      JOIN products p ON o.product_id = p.id
      GROUP BY p.id, p.name
      ORDER BY value DESC
      LIMIT 5
    `);
    if (rows.length === 0) {
      return res.json([{ name: 'No Data', value: 0 }]);
    }
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching distribution', details: error.message });
  }
};