import express from 'express';
import { placeOrder, getMyOrders, changeStatus } from '../controllers/orderController';
const router = express.Router();

router.post('/', placeOrder);
router.get('/my-orders', getMyOrders);
router.put('/:id/status', changeStatus);

export default router;