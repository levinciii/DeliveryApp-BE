import express from 'express';
import * as controller from '../controllers/cart.controller.js';
import requireRole from '../middlewares/requireRole.js';
import validate from '../middlewares/validate.js';
import { productIdParam, setCartItemSchema } from '../models/cart.model.js';

const router = express.Router();

router.use(requireRole('CUSTOMER'));
router.get('/', controller.get);
router.put('/items', validate(setCartItemSchema), controller.setItem);
router.delete('/items/:productId', validate(productIdParam, 'params'), controller.removeItem);
router.delete('/', controller.clear);

export default router;
