import express from 'express';
import * as controller from '../controllers/order.controller.js';
import requireRole from '../middlewares/requireRole.js';
import validate from '../middlewares/validate.js';
import { idParam } from '../models/common.model.js';
import { listOrdersQuery, placeOrderSchema, quoteSchema, updateOrderStatusSchema } from '../models/order.model.js';

const router = express.Router();

const VIEWERS = ['CUSTOMER', 'MERCHANT_OWNER', 'MERCHANT_STAFF', 'ADMIN'];

// Customers place orders. (Declared before /:id so "quote" is never read as an id.)
router.post('/quote', requireRole('CUSTOMER'), validate(quoteSchema), controller.quote);
router.post('/', requireRole('CUSTOMER'), validate(placeOrderSchema), controller.place);

// Customers see their own orders, merchants their branches' orders, admins all of them.
router.get('/', requireRole(...VIEWERS), validate(listOrdersQuery, 'query'), controller.list);
router.get('/:id', requireRole(...VIEWERS), validate(idParam, 'params'), controller.get);
router.patch(
  '/:id/status',
  requireRole(...VIEWERS),
  validate(idParam, 'params'),
  validate(updateOrderStatusSchema),
  controller.updateStatus,
);

export default router;
