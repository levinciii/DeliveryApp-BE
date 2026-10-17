import express from 'express';
import * as controller from '../controllers/product.controller.js';
import requireRole from '../middlewares/requireRole.js';
import validate from '../middlewares/validate.js';
import { idParam } from '../models/common.model.js';
import { listProductsQuery, createProductSchema, updateProductSchema } from '../models/product.model.js';

const router = express.Router();

// Any signed-in user can browse a branch's catalog; only merchant roles can change it.
router.get('/', validate(listProductsQuery, 'query'), controller.list);
router.post('/', requireRole('MERCHANT_OWNER', 'MERCHANT_STAFF'), validate(createProductSchema), controller.create);
router.put(
  '/:id',
  requireRole('MERCHANT_OWNER', 'MERCHANT_STAFF'),
  validate(idParam, 'params'),
  validate(updateProductSchema),
  controller.update,
);

export default router;
