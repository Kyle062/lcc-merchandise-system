import express from 'express';
import { getStudentStats, getStudentRecentOrders } from '../controllers/studentController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// ✅ Only logged-in students can access these routes
router.use(protect, authorize(['student']));

router.get('/stats', getStudentStats);
router.get('/recent-orders', getStudentRecentOrders);

export default router;