import { Request, Response } from "express";
import db from "../config/db";

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [salesResult]: any = await db.query(
      "SELECT COALESCE(SUM(total_price), 0) as totalSales FROM orders",
    );
    const [ordersResult]: any = await db.query(
      "SELECT COUNT(*) as totalOrders FROM orders",
    );
    const [pendingResult]: any = await db.query(
      "SELECT COUNT(*) as pendingOrders FROM orders WHERE status = ?",
      ["Pending"],
    );
    const [lowStockResult]: any = await db.query(
      "SELECT COUNT(*) as lowStock FROM products WHERE stock_quantity < 10",
    );

    res.json({
      totalSales: salesResult[0].totalSales,
      totalOrders: ordersResult[0].totalOrders,
      pendingOrders: pendingResult[0].pendingOrders,
      lowStock: lowStockResult[0].lowStock,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching stats", details: error.message });
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
    res
      .status(500)
      .json({ message: "Error fetching orders", details: error.message });
  }
};

// Actionable stock and queue diagnostics for the admin dashboard
export const getDiagnostics = async (req: Request, res: Response) => {
  try {
    const threshold = Number.parseInt(String(req.query.threshold || "10"), 10);
    const reorderThreshold = Number.isFinite(threshold)
      ? Math.min(100, Math.max(1, threshold))
      : 10;

    const [lowStock]: any = await db.query(
      `SELECT p.id, p.name, p.course, p.stock_quantity AS stock,
              ? AS reorder_threshold,
              COALESCE((
                SELECT SUM(o.quantity)
                FROM orders o
                JOIN order_groups g ON o.group_id = g.id
                WHERE o.product_id = p.id
                  AND g.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
              ), 0) AS units_sold_30d
       FROM products p
       WHERE p.stock_quantity < ?
       ORDER BY p.stock_quantity ASC, units_sold_30d DESC, p.name ASC`,
      [reorderThreshold, reorderThreshold],
    );

    const [aging]: any = await db.query(`
      SELECT
        SUM(CASE WHEN status = 'Pending' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= 24 THEN 1 ELSE 0 END) AS pending_stuck,
        SUM(CASE WHEN status = 'Processing' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= 48 THEN 1 ELSE 0 END) AS processing_stuck,
        SUM(CASE WHEN status = 'In Tailoring' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) >= 72 THEN 1 ELSE 0 END) AS tailoring_stuck,
        AVG(CASE WHEN status IN ('Completed', 'Ready for Pickup')
          THEN TIMESTAMPDIFF(HOUR, created_at, NOW()) END) AS avg_fulfillment_hours
      FROM order_groups
    `);

    const [bottlenecks]: any = await db.query(`
      SELECT id, group_code, status, TIMESTAMPDIFF(HOUR, created_at, NOW()) AS age_hours
      FROM order_groups
      WHERE status IN ('Pending', 'Processing', 'In Tailoring')
      ORDER BY age_hours DESC, created_at ASC
      LIMIT 5
    `);

    const row = aging[0] || {};
    res.json({
      reorderThreshold,
      lowStockTotal: lowStock.length,
      lowStock: lowStock.map((item: any) => {
        const sold = Number(item.units_sold_30d || 0);
        return {
          id: Number(item.id),
          name: item.name,
          course: item.course,
          stock: Number(item.stock),
          reorderThreshold: Number(item.reorder_threshold),
          unitsSold30d: sold,
          velocity: sold >= 10 ? "fast" : sold === 0 ? "slow" : "steady",
        };
      }),
      aging: {
        pendingStuck: Number(row.pending_stuck || 0),
        processingStuck: Number(row.processing_stuck || 0),
        tailoringStuck: Number(row.tailoring_stuck || 0),
      },
      avgFulfillmentHours: row.avg_fulfillment_hours
        ? Math.round(Number(row.avg_fulfillment_hours))
        : 0,
      bottlenecks: bottlenecks.map((item: any) => ({
        groupId: Number(item.id),
        groupCode: item.group_code,
        status: item.status,
        ageHours: Number(item.age_hours),
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Error fetching diagnostics",
      details: error.message,
    });
  }
};

// Get monthly sales data (for bar chart)
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

    // Convert to numbers
    const formatted = rows.map((row: any) => ({
      month: row.month,
      sales: Number(row.sales),
      orders: Number(row.orders),
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error(' Monthly sales error:', error.message);
    res.status(500).json({ message: 'Error fetching monthly sales', details: error.message });
  }
};

// Get inventory distribution by product category (course-based)
export const getInventoryDistribution = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(`
      SELECT 
        course AS name,
        SUM(stock_quantity) AS value
      FROM products
      GROUP BY course
      ORDER BY value DESC
    `);

    if (rows.length === 0) {
      return res.json([{ name: 'No Data', value: 0 }]);
    }

    //  Convert value to Number (MySQL returns SUM as string sometimes)
    const formatted = rows.map((row: any) => ({
      name: row.name,
      value: Number(row.value),
    }));

    console.log('Inventory distribution:', formatted);

    res.json(formatted);
  } catch (error: any) {
    console.error('Inventory distribution error:', error.message);
    res.status(500).json({ message: 'Error fetching distribution', details: error.message });
  }
};
