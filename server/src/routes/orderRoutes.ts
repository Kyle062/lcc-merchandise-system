import express from "express";
import {
  getAllOrders,
  getOrderById,
  getMyOrders,
  placeOrder,
  updateOrderStatus,
  deleteOrder,
  deleteMyPendingOrder,
  scanOrderQR, 
} from "../controllers/orderController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = express.Router();

// Admin & Staff routes
router.get("/", protect, authorize(["admin", "staff"]), getAllOrders);
router.get("/my-orders", protect, authorize(["student"]), getMyOrders);
router.get("/:id", protect, authorize(["admin", "staff"]), getOrderById);

// Student routes
router.post("/", protect, authorize(["student"]), placeOrder);

// ✅ THIS IS THE CRITICAL MISSING ROUTE
router.post("/scan-qr", protect, authorize(["admin", "staff"]), scanOrderQR);

// Update status
router.put(
  "/:id/status",
  protect,
  authorize(["admin", "staff"]),
  updateOrderStatus,
);

// Delete routes
router.delete(
  "/my-orders/:id",
  protect,
  authorize(["student"]),
  deleteMyPendingOrder,
);
router.delete("/:id", protect, authorize(["admin"]), deleteOrder);

export default router;
