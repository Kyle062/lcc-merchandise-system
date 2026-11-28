import { Request, Response } from "express";
import db from "../config/db";
import {
  buildDateClause,
  parseList,
  parsePositiveInt,
  parseSort,
  resolvePeriod,
} from "../utils/queryUtils";

const TAILOR_STATUSES = [
  "Processing",
  "In Tailoring",
  "Ready for Pickup",
  "Completed",
] as const;

const TAILOR_TRANSITIONS: Record<string, string[]> = {
  Processing: ["In Tailoring", "Ready for Pickup", "Completed"],
  "In Tailoring": ["Processing", "Ready for Pickup", "Completed"],
  "Ready for Pickup": ["Processing", "Completed"],
  Completed: [],
};

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

export const getAssignedOrders = async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "").trim();
    const requestedStatuses = parseList(req.query.status).filter((status) =>
      (TAILOR_STATUSES as readonly string[]).includes(status),
    );
    const courses = parseList(req.query.course);
    const period = resolvePeriod(req.query as Record<string, any>);
    const sort = parseSort(
      req.query.sort,
      ["group_id", "student_name", "status", "order_date", "item_count"],
      "order_date",
      "asc",
    );
    const page = parsePositiveInt(req.query.page, 1, 1, 100000);
    const limit = parsePositiveInt(req.query.limit, 10, 1, 100);

    const params: any[] = [];
    const statuses =
      requestedStatuses.length > 0 ? requestedStatuses : [...TAILOR_STATUSES];

    let baseWhere = `WHERE g.status IN (${statuses.map(() => "?").join(",")})`;
    params.push(...statuses);

    if (search) {
      baseWhere += ` AND (
        g.group_code LIKE ? OR CAST(g.id AS CHAR) LIKE ? OR u.full_name LIKE ?
      )`;
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    baseWhere += buildDateClause("g.created_at", period, params);

    const statusParams = [...params];
    let statusWhere = baseWhere;
    if (courses.length > 0) {
      const courseClause = ` AND COALESCE(NULLIF(u.course, ''), '') IN (${courses
        .map(() => "?")
        .join(",")})`;
      baseWhere += courseClause;
      statusWhere += courseClause;
      params.push(...courses);
      statusParams.push(...courses);
    }

    const from = `
      FROM order_groups g
      JOIN users u ON g.user_id = u.id
      JOIN orders o ON g.id = o.group_id
      ${baseWhere}
    `;

    const [countRows]: any = await db.query(
      `SELECT COUNT(DISTINCT g.id) AS total ${from}`,
      params,
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    const [rows]: any = await db.query(
      `SELECT
         g.id AS group_id, g.group_code, g.status, g.created_at AS order_date,
         u.full_name AS student_name, COALESCE(u.course, '') AS course,
         COUNT(o.id) AS item_count
       ${from}
       GROUP BY g.id, g.group_code, g.status, g.created_at, u.full_name, u.course
       ORDER BY ${sort.key === "group_id" ? "g.id" : sort.key === "student_name" ? "u.full_name" : sort.key === "status" ? "g.status" : sort.key === "item_count" ? "COUNT(o.id)" : "g.created_at"} ${sort.dir.toUpperCase()}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const [statusRows]: any = await db.query(
      `SELECT g.status AS status, COUNT(DISTINCT g.id) AS total
       FROM order_groups g
       JOIN users u ON g.user_id = u.id
       JOIN orders o ON g.id = o.group_id
       ${statusWhere}
       GROUP BY g.status`,
      statusParams,
    );
    const statusCounts: Record<string, number> = { All: 0 };
    for (const status of TAILOR_STATUSES) statusCounts[status] = 0;
    for (const row of statusRows) {
      statusCounts[row.status] = Number(row.total);
      statusCounts.All += Number(row.total);
    }

    res.json({
      rows,
      total,
      page: safePage,
      limit,
      totalPages,
      statusCounts,
      period,
    });
  } catch (error: any) {
    res.status(500).json({
      message: "Error fetching assigned orders",
      details: error.message,
    });
  }
};

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

export const updateWorkProgress = async (req: Request, res: Response) => {
  const { group_id } = req.params;
  const { status, expected_status } = req.body;
  const conn = await db.getConnection();

  try {
    if (status === "Refunded") {
      return res.status(400).json({
        message: "Use the refund action to mark an order as Refunded.",
      });
    }
    if (!(TAILOR_TRANSITIONS[status] || status === "Processing")) {
      return res.status(400).json({ message: "Invalid tailoring status." });
    }

    await conn.beginTransaction();

    const [groupRows]: any = await conn.query(
      "SELECT status FROM order_groups WHERE id = ? FOR UPDATE",
      [group_id],
    );

    if (groupRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: "Order group not found." });
    }

    const currentStatus = groupRows[0].status;
    if (currentStatus === "Refunded" || currentStatus === "Cancelled") {
      await conn.rollback();
      return res.status(400).json({
        message: `${currentStatus} orders cannot be modified.`,
      });
    }

    if (expected_status && expected_status !== currentStatus) {
      await conn.rollback();
      return res.status(409).json({
        message: `Status changed from ${expected_status} to ${currentStatus} by another user. Refresh the queue before retrying.`,
        currentStatus,
      });
    }

    const allowed = TAILOR_TRANSITIONS[currentStatus] || [];
    if (status !== currentStatus && !allowed.includes(status)) {
      await conn.rollback();
      return res.status(400).json({
        message: `Cannot change status from ${currentStatus} to ${status}.`,
        currentStatus,
      });
    }

    await conn.query("UPDATE order_groups SET status = ? WHERE id = ?", [
      status,
      group_id,
    ]);
    await conn.query("UPDATE orders SET status = ? WHERE group_id = ?", [
      status,
      group_id,
    ]);

    await conn.commit();
    res.json({
      message: `Order progress updated to ${status}`,
      status,
      currentStatus,
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({
      message: "Error updating progress",
      details: error.message,
    });
  } finally {
    conn.release();
  }
};

// ✅ THIS IS THE MISSING FUNCTION THAT WAS CAUSING THE ERROR
export const getTailorReportAnalytics = async (req: Request, res: Response) => {
  try {
    const period = resolvePeriod(req.query as Record<string, any>);
    const dateParams: any[] = [];
    const dateFilter = buildDateClause("g.created_at", period, dateParams);

    // 1. Revenue per day
    const [revenueData]: any = await db.query(
      `SELECT
         DATE_FORMAT(g.created_at, '%b %d') AS label,
         SUM(o.total_price) AS revenue
       FROM order_groups g
       JOIN orders o ON g.id = o.group_id
       WHERE g.status IN ('Ready for Pickup', 'Completed') ${dateFilter}
       GROUP BY DATE_FORMAT(g.created_at, '%b %d'), DATE(g.created_at)
       ORDER BY DATE(g.created_at) ASC`,
      dateParams,
    );

    // 2. Most Requested Merchandise
    const [topItems]: any = await db.query(
      `SELECT
         p.name AS item_name,
         SUM(o.quantity) AS total_qty
       FROM orders o
       JOIN order_groups g ON o.group_id = g.id
       JOIN products p ON o.product_id = p.id
       WHERE g.status IN ('Ready for Pickup', 'Completed') ${dateFilter}
       GROUP BY p.name
       ORDER BY total_qty DESC
       LIMIT 5`,
      dateParams,
    );

    // 3. Total Revenue
    const [totalRev]: any = await db.query(
      `SELECT COALESCE(SUM(o.total_price), 0) AS total
       FROM order_groups g
       JOIN orders o ON g.id = o.group_id
       WHERE g.status IN ('Ready for Pickup', 'Completed') ${dateFilter}`,
      dateParams,
    );

    res.json({
      revenueChart: revenueData,
      topItemsChart: topItems,
      totalRevenue: totalRev[0].total,
      period: period.label,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    res
      .status(500)
      .json({ message: "Error fetching analytics", details: error.message });
  }
};
