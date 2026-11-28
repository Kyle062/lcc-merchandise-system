import express from 'express';
import {
  getSettings,
  updateSettings,
  clearCancelledOrders,
  resetOrderCounter,
  getSystemInfo,
  exportOrdersCSV,
  exportInventory,
  exportSales,
} from '../controllers/settingsController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require admin
router.use(protect, authorize(['admin']));

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/system-info', getSystemInfo);
router.delete('/clear-cancelled', clearCancelledOrders);
router.post('/reset-order-counter', resetOrderCounter);
router.get('/export-orders', exportOrdersCSV);
router.get('/export-inventory', exportInventory);
router.get('/export-sales', exportSales);

export default router;