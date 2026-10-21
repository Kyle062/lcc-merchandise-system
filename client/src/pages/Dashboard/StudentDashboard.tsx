import { Request, Response } from 'express';
import db from '../config/db';

// GET Student Dashboard Stats
export const getStudentStats = async (req: Request, res: Response) => {
  try {
    // ✅ Get the logged-in student's ID from the JWT token (set by authMiddleware)
    const studentId = (req as any).user.id;

    // 1. Total Orders placed by this student
    const [totalOrdersResult]: any = await db.query(
      'SELECT COUNT(*) as total FROM orders WHERE user_id = ?',
      [studentId]
    );

    // 2. Active Orders (Pending, Processing, Ready for Pickup)
    const [activeOrdersResult]: any = await db.query(
      `SELECT COUNT(*) as total FROM orders 
       WHERE user_id = ? AND status IN ('Pending', 'Processing', 'Ready for Pickup')`,
      [studentId]
    );

    // 3. Completed Orders
    const [completedOrdersResult]: any = await db.query(
      `SELECT COUNT(*) as total FROM orders 
       WHERE user_id = ? AND status = 'Completed'`,
      [studentId]
    );

    // 4. Total Spent (Only count Completed orders)
    const [totalSpentResult]: any = await db.query(
      `SELECT COALESCE(SUM(total_price), 0) as total FROM orders 
       WHERE user_id = ? AND status = 'Completed'`,
      [studentId]
    );

    res.json({
      totalOrders: Number(totalOrdersResult[0].total),
      activeOrders: Number(activeOrdersResult[0].total),
      completedOrders: Number(completedOrdersResult[0].total),
      totalSpent: Number(totalSpentResult[0].total),
    });
  } catch (error: any) {
    console.error('❌ Student stats error:', error.message);
    res.status(500).json({ message: 'Error fetching student stats', details: error.message });
  }
};

// GET Student's Recent Orders (For the dashboard table)
export const getStudentRecentOrders = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;

    const [rows]: any = await db.query(
      `SELECT 
        o.id, 
        o.quantity, 
        o.total_price, 
        o.status, 
        o.order_date,
        p.name AS product_name,
        p.size AS product_size
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.user_id = ?
      ORDER BY o.order_date DESC
      LIMIT 5`,
      [studentId]
    );

    res.json(rows);
  } catch (error: any) {
    console.error('❌ Student recent orders error:', error.message);
    res.status(500).json({ message: 'Error fetching recent orders', details: error.message });
  }
};