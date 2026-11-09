import express from "express";
import {
  getTailorStats,
  getAssignedOrders,
  getOrderDetails,
  updateWorkProgress,
  getTailorReportAnalytics, 
} from "../controllers/tailorController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/stats", protect, authorize(["tailor", "admin"]), getTailorStats);
router.get(
  "/assigned",
  protect,
  authorize(["tailor", "admin"]),
  getAssignedOrders,
);
router.get(
  "/details/:group_id",
  protect,
  authorize(["tailor", "admin"]),
  getOrderDetails,
);
router.put(
  "/progress/:group_id",
  protect,
  authorize(["tailor", "admin"]),
  updateWorkProgress,
);
router.get(
  "/analytics",
  protect,
  authorize(["tailor", "admin"]),
  getTailorReportAnalytics,
); // ✅ Add this

export default router;
