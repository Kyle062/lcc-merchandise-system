import { Request, Response } from "express";
import db from "../config/db";

// GET Stats for Tailor Dashboard
export const getTailorStats = async (req: Request, res: Response) => {
  try {
    const [assigned]: any = await db.query(
      "SELECT COUNT(*) as total FROM order_groups WHERE status = 'Processing'",
    );
    const [inProgress]: any = await db.query(
      "SELECT COUNT(*) as total FROM order_groups WHERE status = 'In Tailoring'",
    );
    const [completed]: any = await db.query(
      `SELECT COUNT(*) as total FROM order_groups 
       WHERE status = 'Ready for Pickup' AND DATE(created_at) = CURDATE()`,
    );

    res.json({
      assignedOrders: assigned[0].total,
      inProgress: inProgress[0].total,
      completedToday: completed[0].total,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching stats", details: error.message });
  }
};

// GET Assigned Orders (Queue)
export const getAssignedOrders = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        g.id AS group_id,
        g.status,
        g.created_at AS order_date,
        u.full_name AS student_name,
        COUNT(o.id) AS item_count
      FROM order_groups g
      JOIN users u ON g.user_id = u.id
      JOIN orders o ON g.id = o.group_id
      WHERE g.status IN ('Processing', 'In Tailoring', 'Ready for Pickup', 'Completed')
      GROUP BY g.id
      ORDER BY g.created_at ASC
    `);
    res.json(rows);
  } catch (error: any) {
    res
      .status(500)
      .json({
        message: "Error fetching assigned orders",
        details: error.message,
      });
  }
};

// GET Order Details for a specific group
export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    const { group_id } = req.params;
    const [items]: any = await db.query(
      `
      SELECT o.id, o.quantity, p.name, p.size 
      FROM orders o
      JOIN products p ON o.product_id = p.id
      WHERE o.group_id = ?
    `,
      [group_id],
    );
    res.json(items);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching details", details: error.message });
  }
};

// UPDATE Work Progress
export const updateWorkProgress = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { status } = req.body;

  try {
    await db.query("UPDATE order_groups SET status = ? WHERE id = ?", [
      status,
      group_id,
    ]);
    await db.query("UPDATE orders SET status = ? WHERE group_id = ?", [
      status,
      group_id,
    ]);
    res.json({ message: `Order progress updated to ${status}` });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error updating progress", details: error.message });
  }
};

// ✅ NEW: GET Report Analytics (Revenue & Most Requested)
export const getTailorReportAnalytics = async (req: Request, res: Response) => {
  const { timeframe } = req.query; // 'day', 'week', 'month'

  let dateFilter = "";
  if (timeframe === "day") dateFilter = "DATE(g.created_at) = CURDATE()";
  else if (timeframe === "week")
    dateFilter = "YEARWEEK(g.created_at, 1) = YEARWEEK(CURDATE(), 1)";
  else if (timeframe === "month")
    dateFilter =
      "MONTH(g.created_at) = MONTH(CURDATE()) AND YEAR(g.created_at) = YEAR(CURDATE())";
  else dateFilter = "1=1";

  try {
    // 1. Revenue per day
    const [revenueData]: any = await db.query(`
      SELECT 
        DATE_FORMAT(g.created_at, '%b %d') AS label,
        SUM(o.total_price) AS revenue
      FROM order_groups g
      JOIN orders o ON g.id = o.group_id
      WHERE g.status IN ('Ready for Pickup', 'Completed') AND ${dateFilter}
      GROUP BY DATE_FORMAT(g.created_at, '%b %d')
      ORDER BY MIN(g.created_at) ASC
    `);

    // 2. Most Requested Merchandise
    const [topItems]: any = await db.query(`
      SELECT 
        p.name AS item_name,
        SUM(o.quantity) AS total_qty
      FROM orders o
      JOIN order_groups g ON o.group_id = g.id
      JOIN products p ON o.product_id = p.id
      WHERE g.status IN ('Ready for Pickup', 'Completed') AND ${dateFilter}
      GROUP BY p.name
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    // 3. Total Revenue
    const [totalRev]: any = await db.query(`
      SELECT COALESCE(SUM(o.total_price), 0) AS total
      FROM order_groups g
      JOIN orders o ON g.id = o.group_id
      WHERE g.status IN ('Ready for Pickup', 'Completed') AND ${dateFilter}
    `);

    res.json({
      revenueChart: revenueData,
      topItemsChart: topItems,
      totalRevenue: totalRev[0].total,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    res
      .status(500)
      .json({ message: "Error fetching analytics", details: error.message });
  }
};
