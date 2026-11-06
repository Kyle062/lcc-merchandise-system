import { Request, Response } from "express";
import db from "../config/db";

// GET Student Dashboard Stats
export const getStudentStats = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;

    // 1. Total Orders (Counting unique groups from the orders table)
    const [totalOrdersResult]: any = await db.query(
      "SELECT COUNT(DISTINCT o.group_id) as total FROM orders o WHERE o.user_id = ?",
      [studentId],
    );

    // 2. Active Orders (Pending, Processing, Ready for Pickup)
    const [activeOrdersResult]: any = await db.query(
      `SELECT COUNT(DISTINCT g.id) as total FROM order_groups g 
       WHERE g.user_id = ? AND g.status IN ('Pending', 'Processing', 'Ready for Pickup')`,
      [studentId],
    );

    // 3. Completed Orders
    const [completedOrdersResult]: any = await db.query(
      `SELECT COUNT(DISTINCT g.id) as total FROM order_groups g 
       WHERE g.user_id = ? AND g.status = 'Completed'`,
      [studentId],
    );

    // 4. Total Spent (Counts all orders EXCEPT Cancelled)
    const [totalSpentResult]: any = await db.query(
      `SELECT COALESCE(SUM(o.total_price), 0) as total FROM orders o
       JOIN order_groups g ON o.group_id = g.id
       WHERE o.user_id = ? AND g.status != 'Cancelled'`,
      [studentId],
    );

    res.json({
      totalOrders: Number(totalOrdersResult[0].total),
      activeOrders: Number(activeOrdersResult[0].total),
      completedOrders: Number(completedOrdersResult[0].total),
      totalSpent: Number(totalSpentResult[0].total),
    });
  } catch (error: any) {
    console.error("❌ Student stats error:", error.message);
    res
      .status(500)
      .json({
        message: "Error fetching student stats",
        details: error.message,
      });
  }
};

// GET Student's Recent Orders (For the dashboard table)
export const getStudentRecentOrders = async (req: Request, res: Response) => {
  try {
    const studentId = (req as any).user.id;

    const [rows]: any = await db.query(
      `SELECT 
        g.id AS group_id, 
        g.status, 
        g.created_at AS order_date,
        COUNT(o.id) AS item_count,
        SUM(o.total_price) AS total_price
      FROM order_groups g
      JOIN orders o ON g.id = o.group_id
      WHERE g.user_id = ?
      GROUP BY g.id
      ORDER BY g.created_at DESC
      LIMIT 5`,
      [studentId],
    );

    res.json(rows);
  } catch (error: any) {
    console.error("❌ Student recent orders error:", error.message);
    res
      .status(500)
      .json({
        message: "Error fetching recent orders",
        details: error.message,
      });
  }
};
