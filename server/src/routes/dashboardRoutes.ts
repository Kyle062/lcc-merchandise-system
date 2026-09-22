import express from 'express';
import {
  getAdminStats,
  getRecentOrders,
  getMonthlySales,
  getInventoryDistribution,
} from '../controllers/dashboardController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/stats', protect, authorize(['admin']), getAdminStats);
router.get('/recent-orders', protect, authorize(['admin']), getRecentOrders);
router.get('/monthly-sales', protect, authorize(['admin']), getMonthlySales);
router.get('/inventory-distribution', protect, authorize(['admin']), getInventoryDistribution);

export default router;