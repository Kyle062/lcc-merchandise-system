import express from "express";
import {
  approveRefund,
  createRefund,
  getRefundById,
  getRefunds,
  rejectRefund,
} from "../controllers/refundController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", protect, authorize(["admin", "student"]), createRefund);
router.get("/", protect, authorize(["admin", "student"]), getRefunds);
router.get("/:id", protect, authorize(["admin", "student"]), getRefundById);
router.post("/:id/approve", protect, authorize(["admin"]), approveRefund);
router.post("/:id/reject", protect, authorize(["admin"]), rejectRefund);

export default router;
