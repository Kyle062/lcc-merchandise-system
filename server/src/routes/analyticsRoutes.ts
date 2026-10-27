import express from "express";
import { getAnalytics } from "../controllers/analyticsController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", protect, authorize(["admin"]), getAnalytics);

export default router;
