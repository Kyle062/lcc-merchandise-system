import { Request, Response } from "express";
import db from "../config/db";
import { buildDateClause, resolvePeriod } from "../utils/queryUtils";

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const period = resolvePeriod(req.query as Record<string, any>);
    const params: any[] = [];
    const dateFilter = buildDateClause("g.created_at", period, params);

    const [stockByFaculty]: any = await db.query(`
      SELECT course AS name, SUM(stock_quantity) AS value
      FROM products
      GROUP BY course
      ORDER BY value DESC
    `);

    const [topSellers]: any = await db.query(
      `SELECT p.name AS product_name, SUM(o.quantity) AS total_sold, SUM(o.total_price) AS revenue
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN order_groups g ON o.group_id = g.id
       WHERE g.status = 'Completed' ${dateFilter}
       GROUP BY p.id, p.name
       ORDER BY total_sold DESC
       LIMIT 5`,
      params,
    );

    const [lowStock]: any = await db.query(
      `SELECT p.id, p.name, p.course, p.stock_quantity AS stock,
             10 AS reorder_threshold,
             COALESCE((
               SELECT SUM(o.quantity)
               FROM orders o
               JOIN order_groups g ON o.group_id = g.id
               WHERE o.product_id = p.id ${dateFilter}
             ), 0) AS units_sold_period
       FROM products p
       WHERE p.stock_quantity < 10
       ORDER BY p.stock_quantity ASC, units_sold_period DESC, p.name ASC`,
      params,
    );

    const [dailyOrders]: any = await db.query(
      `SELECT DATE_FORMAT(g.created_at, '%Y-%m-%d') AS day,
              COUNT(DISTINCT g.id) AS orders
       FROM order_groups g
       ${dateFilter ? `WHERE 1=1 ${dateFilter}` : ""}
       GROUP BY DATE(g.created_at)
       ORDER BY DATE(g.created_at) ASC`,
      params,
    );

    const [fulfillment]: any = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(HOUR, g.created_at, NOW())) AS avg_hours
       FROM order_groups g
       WHERE g.status IN ('Completed', 'Ready for Pickup') ${dateFilter}`,
      params,
    );

    const [revenueByFaculty]: any = await db.query(
      `SELECT p.course AS name, SUM(o.total_price) AS revenue
       FROM orders o
       JOIN products p ON o.product_id = p.id
       JOIN order_groups g ON o.group_id = g.id
       WHERE g.status = 'Completed' ${dateFilter}
       GROUP BY p.course
       ORDER BY revenue DESC`,
      params,
    );

    const [aging]: any = await db.query(
      `SELECT
        SUM(CASE WHEN g.status = 'Pending' AND TIMESTAMPDIFF(HOUR, g.created_at, NOW()) >= 24 THEN 1 ELSE 0 END) AS pending_stuck,
        SUM(CASE WHEN g.status = 'Processing' AND TIMESTAMPDIFF(HOUR, g.created_at, NOW()) >= 48 THEN 1 ELSE 0 END) AS processing_stuck,
        SUM(CASE WHEN g.status = 'In Tailoring' AND TIMESTAMPDIFF(HOUR, g.created_at, NOW()) >= 72 THEN 1 ELSE 0 END) AS tailoring_stuck
       FROM order_groups g
       ${dateFilter ? `WHERE 1=1 ${dateFilter}` : ""}`,
      params,
    );

    const [bottlenecks]: any = await db.query(
      `SELECT g.id, g.group_code, g.status,
              TIMESTAMPDIFF(HOUR, g.created_at, NOW()) AS age_hours
       FROM order_groups g
       ${dateFilter ? `WHERE 1=1 ${dateFilter}` : "WHERE 1=1"}
       AND g.status IN ('Pending', 'Processing', 'In Tailoring')
       ORDER BY age_hours DESC, g.created_at ASC
       LIMIT 5`,
      params,
    );

    const agingRow = aging[0] || {};
    const pendingStuck = Number(agingRow.pending_stuck || 0);
    const processingStuck = Number(agingRow.processing_stuck || 0);
    const tailoringStuck = Number(agingRow.tailoring_stuck || 0);

    res.json({
      period: period.label,
      stockByFaculty: stockByFaculty.map((r: any) => ({
        name: r.name,
        value: Number(r.value),
      })),
      topSellers: topSellers.map((r: any) => ({
        name: r.product_name,
        sold: Number(r.total_sold),
        revenue: Number(r.revenue),
      })),
      lowStock: lowStock.map((r: any) => {
        const sold = Number(r.units_sold_period || 0);
        return {
          id: Number(r.id),
          name: r.name,
          course: r.course,
          stock: Number(r.stock),
          reorderThreshold: Number(r.reorder_threshold),
          unitsSoldPeriod: sold,
          velocity: sold >= 10 ? "fast" : sold === 0 ? "slow" : "steady",
        };
      }),
      dailyOrders: dailyOrders.map((r: any) => ({
        day: r.day,
        orders: Number(r.orders),
      })),
      avgFulfillmentHours: fulfillment[0]?.avg_hours
        ? Math.round(Number(fulfillment[0].avg_hours))
        : 0,
      revenueByFaculty: revenueByFaculty.map((r: any) => ({
        name: r.name,
        revenue: Number(r.revenue),
      })),
      diagnostics: {
        pendingStuck,
        processingStuck,
        tailoringStuck,
        bottlenecks: bottlenecks.map((row: any) => ({
          groupId: Number(row.id),
          groupCode: row.group_code,
          status: row.status,
          ageHours: Number(row.age_hours),
        })),
        message:
          pendingStuck + processingStuck + tailoringStuck === 0
            ? "No aging bottlenecks detected."
            : `${pendingStuck + processingStuck + tailoringStuck} order(s) are past their expected stage age.`,
      },
    });
  } catch (error: any) {
    console.error("❌ Analytics error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching analytics", details: error.message });
  }
};
