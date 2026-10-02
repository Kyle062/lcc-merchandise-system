import express from 'express';
import {
  getAllOrders,
  getOrderById,
  getMyOrders,
  placeOrder,
  updateOrderStatus,
  deleteOrder,
} from '../controllers/orderController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'staff']), getAllOrders);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.post('/', protect, authorize(['student']), placeOrder);
router.put('/:id/status', protect, authorize(['admin', 'staff']), updateOrderStatus);
router.delete('/:id', protect, authorize(['admin']), deleteOrder);

export default router;