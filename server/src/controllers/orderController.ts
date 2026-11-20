import { Request, Response } from "express";
import db from "../config/db";
import {
  signReceipt,
  verifyReceipt,
  buildOrderSnapshot,
  buildCanonicalString,
  diffSnapshots,
  OrderSnapshot,
} from "../utils/cryptoUtils";

// GET all orders (Admin)
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date, o.group_id,
        p.id AS product_id, p.name AS product_name, p.course AS product_course, p.size AS product_size, p.price AS product_unit_price,
        u.id AS user_id, u.username, u.full_name, u.email, u.course AS user_course,
        g.digital_signature, g.payload_snapshot, g.group_code
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      JOIN order_groups g ON o.group_id = g.id
      ORDER BY o.order_date DESC
    `);
    res.json(rows);
  } catch (error: any) {
    console.error("❌ getAllOrders error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching orders", details: error.message });
  }
};

// GET single order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const [rows]: any = await db.query(
      `
      SELECT 
        o.*,
        p.name AS product_name,
        p.course AS product_course,
        p.price AS product_price,
        p.size AS product_size,
        u.username,
        u.full_name,
        u.email
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `,
      [req.params.id],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Order not found" });
    res.json(rows[0]);
  } catch (error: any) {
    console.error("❌ getOrderById error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching order", details: error.message });
  }
};

// GET orders for current student (Grouped by Group ID)
export const getMyOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const [rows] = await db.query(
      `
      SELECT 
        o.id, o.quantity, o.total_price, o.status, o.order_date, o.group_id,
        p.name AS product_name, p.size AS product_size,
        g.digital_signature
      FROM orders o
      JOIN products p ON o.product_id = p.id
      JOIN order_groups g ON o.group_id = g.id
      WHERE o.user_id = ?
      ORDER BY o.order_date DESC
    `,
      [userId],
    );
    res.json(rows);
  } catch (error: any) {
    console.error("❌ getMyOrders error:", error.message);
    res
      .status(500)
      .json({ message: "Error fetching orders", details: error.message });
  }
};

// PLACE MULTIPLE ORDERS (With Digital Signature + Snapshot)
export const placeOrder = async (req: Request, res: Response) => {
  const { items } = req.body;
  const user_id = (req as any).user.id;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();
    const groupCode = `GRP-${Date.now()}`;
    const [groupResult]: any = await conn.query(
      "INSERT INTO order_groups (user_id, group_code, status) VALUES (?, ?, ?)",
      [user_id, groupCode, "Pending"],
    );
    const groupId = groupResult.insertId;

    // 1. Fetch user info (needed for the snapshot)
    const [userRows]: any = await conn.query(
      "SELECT id, username, full_name, email, course FROM users WHERE id = ?",
      [user_id],
    );
    if (userRows.length === 0) throw new Error("User not found");
    const user = userRows[0];

    // 2. Insert order rows + collect items for snapshot
    const snapshotItems: Array<{
      product_id: number;
      name: string;
      size: string | null;
      course: string | null;
      quantity: number;
      unit_price: number;
    }> = [];

    for (const item of items) {
      const { product_id, quantity } = item;
      const [productRows]: any = await conn.query(
        "SELECT * FROM products WHERE id = ?",
        [product_id],
      );
      if (productRows.length === 0) throw new Error(`Product not found`);

      const product = productRows[0];
      if (product.stock_quantity < quantity)
        throw new Error(`Insufficient stock for ${product.name}`);

      const total_price = Number((product.price * quantity).toFixed(2));

      await conn.query(
        "INSERT INTO orders (group_id, user_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?, ?)",
        [groupId, user_id, product_id, quantity, total_price, "Pending"],
      );

      snapshotItems.push({
        product_id: product.id,
        name: product.name,
        size: product.size,
        course: product.course,
        quantity,
        unit_price: Number(product.price),
      });
    }

    // 3. Build snapshot + sign it
    const timestamp = new Date().toISOString();
    const snapshot = buildOrderSnapshot({
      group_id: groupId,
      group_code: groupCode,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        course: user.course,
      },
      items: snapshotItems,
      timestamp,
    });

    const payloadString = buildCanonicalString(snapshot);
    const digitalSignature = signReceipt(payloadString);

    // 4. Save signature + snapshot
    await conn.query(
      "UPDATE order_groups SET digital_signature = ?, payload_snapshot = ? WHERE id = ?",
      [digitalSignature, JSON.stringify(snapshot), groupId],
    );

    await conn.commit();

    res.status(201).json({
      message: "Order placed",
      groupId,
      digitalSignature,
      // frontend wants the snapshot total for receipt display
      total: snapshot.total,
    });
  } catch (error: any) {
    await conn.rollback();
    console.error("❌ placeOrder error:", error.message);
    res.status(500).json({ message: error.message || "Error placing order" });
  } finally {
    conn.release();
  }
};

// ✅ NEW: Verify Receipt Signature (With Field-Level Diff)
export const verifyReceiptSignature = async (req: Request, res: Response) => {
  const { group_id } = req.body;

  try {
    // 1. Fetch group + stored snapshot
    const [groupRows]: any = await db.query(
      "SELECT id, group_code, user_id, digital_signature, payload_snapshot FROM order_groups WHERE id = ?",
      [group_id],
    );

    if (groupRows.length === 0) {
      return res
        .status(404)
        .json({ isValid: false, message: "Order group not found" });
    }

    const group = groupRows[0];

    // 2. Legacy fallback: no signature at all
    if (!group.digital_signature) {
      return res.json({
        isValid: false,
        message: "No digital signature found for this receipt.",
        diffs: [
          {
            field: "digital_signature",
            signed: "(missing)",
            current: "(missing)",
          },
        ],
      });
    }

    // 3. Legacy fallback: old order that has signature but no snapshot
    if (!group.payload_snapshot) {
      return res.json({
        isValid: false,
        legacy: true,
        message:
          "This order was placed before the secure snapshot system. It cannot be verified.",
        diffs: [
          {
            field: "payload_snapshot",
            signed: "(missing — legacy order)",
            current: "(unverifiable)",
          },
        ],
      });
    }

    // 4. Rebuild LIVE snapshot from current DB state
    const [userRows]: any = await db.query(
      "SELECT id, username, full_name, email, course FROM users WHERE id = ?",
      [group.user_id],
    );
    if (userRows.length === 0) {
      return res.json({ isValid: false, message: "User no longer exists." });
    }
    const user = userRows[0];

    const [itemRows]: any = await db.query(
      `SELECT o.product_id, o.quantity, o.total_price,
              p.name, p.size, p.course, p.price
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.group_id = ?
       ORDER BY o.id ASC`,
      [group_id],
    );

    // 5. Rebuild snapshot using the SAME function as placeOrder
    //    Preserve the ORIGINAL timestamp from the stored snapshot so
    //    "timestamp" is not flagged as a tamper.
    const storedSnapshot: OrderSnapshot = JSON.parse(
      typeof group.payload_snapshot === "string"
        ? group.payload_snapshot
        : JSON.stringify(group.payload_snapshot),
    );

    const liveSnapshot = buildOrderSnapshot({
      group_id: group.id,
      group_code: group.group_code,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        course: user.course,
      },
      items: itemRows.map((r: any) => ({
        product_id: r.product_id,
        name: r.name,
        size: r.size,
        course: r.course,
        quantity: r.quantity,
        unit_price: Number(r.price),
      })),
      timestamp: storedSnapshot.timestamp, // keep original timestamp
    });

    // 6. Recompute signature from LIVE snapshot
    const liveString = buildCanonicalString(liveSnapshot);
    const recomputedSignature = signReceipt(liveString);

    // 7. Compare
    const signaturesMatch = recomputedSignature === group.digital_signature;

    if (signaturesMatch) {
      return res.json({
        isValid: true,
        message: "Signature is valid. No tampering detected.",
        diffs: [],
      });
    }

    // 8. Tampered! Compute field-level diff
    const diffs = diffSnapshots(storedSnapshot, liveSnapshot);

    return res.json({
      isValid: false,
      message: "TAMPERED RECEIPT DETECTED. Fields have been modified.",
      diffs,
    });
  } catch (error: any) {
    console.error("❌ verifyReceiptSignature error:", error.message);
    res.status(500).json({
      isValid: false,
      message: "Error verifying signature",
      details: error.message,
    });
  }
};

// Scan Preview (Gets group details for the modal before confirming)
export const getScanPreview = async (req: Request, res: Response) => {
  const { group_id } = req.body;
  try {
    const [groupRows]: any = await db.query(
      "SELECT * FROM order_groups WHERE id = ?",
      [group_id],
    );

    if (groupRows.length === 0)
      return res.status(404).json({ message: "Order Group not found." });

    if (!groupRows[0].digital_signature) {
      return res
        .status(400)
        .json({ message: "TAMPERED RECEIPT: Missing Digital Signature." });
    }

    if (groupRows[0].status !== "Pending")
      return res
        .status(400)
        .json({ message: `This order is already "${groupRows[0].status}".` });

    const [items]: any = await db.query(
      `SELECT o.id, o.product_id, o.quantity, o.total_price, p.name, p.size, p.price
       FROM orders o JOIN products p ON o.product_id = p.id
       WHERE o.group_id = ?`,
      [group_id],
    );

    const [userRows]: any = await db.query(
      "SELECT full_name, course FROM users WHERE id = ?",
      [groupRows[0].user_id],
    );

    res.json({
      group: groupRows[0],
      user: userRows[0] || { full_name: "Unknown" },
      items,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error fetching preview", details: error.message });
  }
};

// Confirm Scan (Admin clicks Confirm on the Modal)
export const confirmScanOrder = async (req: Request, res: Response) => {
  const { group_id, items } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    for (const item of items) {
      const [productRows]: any = await conn.query(
        "SELECT stock_quantity, name FROM products WHERE id = ?",
        [item.product_id],
      );
      if (productRows.length === 0) throw new Error(`Product not found.`);
      if (productRows[0].stock_quantity < item.quantity)
        throw new Error(`Not enough stock for ${productRows[0].name}.`);

      await conn.query(
        "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
        [item.quantity, item.product_id],
      );
      await conn.query(
        "UPDATE orders SET quantity = ?, total_price = ?, status = 'Processing' WHERE id = ?",
        [item.quantity, item.total_price, item.id],
      );
    }

    await conn.query(
      'UPDATE order_groups SET status = "Processing" WHERE id = ?',
      [group_id],
    );

    await conn.commit();
    res.json({ message: "Order processed and stock updated successfully." });
  } catch (error: any) {
    await conn.rollback();
    res
      .status(500)
      .json({ message: error.message || "Server error during confirmation" });
  } finally {
    conn.release();
  }
};

// Update whole Group Status (Admin dropdown)
export const updateOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params;
  try {
    await db.query("UPDATE order_groups SET status = ? WHERE id = ?", [
      status,
      id,
    ]);
    await db.query("UPDATE orders SET status = ? WHERE group_id = ?", [
      status,
      id,
    ]);
    res.json({ message: "Status updated" });
  } catch (error: any) {
    console.error("❌ updateOrderStatus error:", error.message);
    res.status(500).json({ message: "Error updating status" });
  }
};

// Delete whole Group (Admin)
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    await db.query("DELETE FROM order_groups WHERE id = ?", [req.params.id]);
    res.json({ message: "Order group deleted" });
  } catch (error: any) {
    console.error("❌ deleteOrder error:", error.message);
    res.status(500).json({ message: "Error deleting order" });
  }
};

// Student Delete (Only if Pending)
export const deleteMyPendingOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  try {
    const [groupRows]: any = await db.query(
      "SELECT * FROM order_groups WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    if (groupRows.length === 0)
      return res.status(404).json({ message: "Order not found" });
    if (groupRows[0].status !== "Pending")
      return res
        .status(400)
        .json({ message: "Cannot delete processed orders." });

    await db.query("DELETE FROM order_groups WHERE id = ?", [id]);
    res.json({ message: "Pending order cancelled successfully" });
  } catch (error: any) {
    console.error("❌ deleteMyPendingOrder error:", error.message);
    res
      .status(500)
      .json({ message: "Error deleting order", details: error.message });
  }
};
