import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsPaged,
} from '../controllers/productController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', getProducts);
router.get('/paged', protect, authorize(['admin', 'staff']), getProductsPaged);
router.get('/:id', getProduct);
router.post('/', protect, authorize(['admin', 'staff']), createProduct);
router.put('/:id', protect, authorize(['admin', 'staff']), updateProduct);
router.delete('/:id', protect, authorize(['admin']), deleteProduct);

export default router;