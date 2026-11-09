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

// GET Order Details for a specific group (to see sizes and items)
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
  const { status } = req.body; // 'In Tailoring' or 'Ready for Pickup'

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
