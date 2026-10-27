import { Request, Response } from "express";
import db from "../config/db";

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const [stockByFaculty]: any = await db.query(`
      SELECT course AS name, SUM(stock_quantity) AS value 
      FROM products 
      GROUP BY course 
      ORDER BY value DESC
    `);

    const [topSellers]: any = await db.query(`
      SELECT p.name AS product_name, SUM(o.quantity) AS total_sold, SUM(o.total_price) AS revenue
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.status = 'Completed'
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    const [lowStock]: any = await db.query(`
      SELECT name, course, stock_quantity 
      FROM products 
      WHERE stock_quantity < 10 
      ORDER BY stock_quantity ASC
    `);

    const [dailyOrders]: any = await db.query(`
      SELECT DATE_FORMAT(order_date, '%b %d') AS day, COUNT(DISTINCT group_id) AS orders
      FROM orders
      WHERE order_date >= DATE_SUB(NOW(), INTERVAL 14 DAY)
      GROUP BY DATE_FORMAT(order_date, '%b %d'), DATE(order_date)
      ORDER BY DATE(order_date) ASC
    `);

    const [fulfillment]: any = await db.query(`
      SELECT AVG(TIMESTAMPDIFF(HOUR, order_date, NOW())) AS avg_hours 
      FROM orders WHERE status = 'Completed' OR status = 'Ready for Pickup'
    `);

    // ✅ NEW: Revenue per Faculty based on completed orders
    const [revenueByFaculty]: any = await db.query(`
      SELECT p.course AS name, SUM(o.total_price) AS revenue
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.status = 'Completed'
      GROUP BY p.course
      ORDER BY revenue DESC
    `);

    res.json({
      stockByFaculty: stockByFaculty.map((r: any) => ({
        name: r.name,
        value: Number(r.value),
      })),
      topSellers: topSellers.map((r: any) => ({
        name: r.product_name,
        sold: Number(r.total_sold),
        revenue: Number(r.revenue),
      })),
      lowStock: lowStock.map((r: any) => ({
        name: r.name,
        course: r.course,
        stock: Number(r.stock_quantity),
      })),
      dailyOrders: dailyOrders.map((r: any) => ({
        day: r.day,
        orders: Number(r.orders),
      })),
      avgFulfillmentHours: fulfillment[0].avg_hours
        ? Math.round(fulfillment[0].avg_hours)
        : 0,
      revenueByFaculty: revenueByFaculty.map((r: any) => ({
        name: r.name,
        revenue: Number(r.revenue),
      })),
    });
  } catch (error: any) {
    console.error("❌ Analytics error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching analytics", details: error.message });
  }
};
