import express from "express";
import { createRefund, getRefunds } from "../controllers/refundController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/", protect, authorize(["admin", "student"]), createRefund);
router.get("/", protect, authorize(["admin", "student"]), getRefunds);

export default router;
