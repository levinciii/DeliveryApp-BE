import express from 'express';
import * as controller from '../controllers/merchant.controller.js';
import requireRole from '../middlewares/requireRole.js';
import validate from '../middlewares/validate.js';
import { idParam } from '../models/common.model.js';
import { createMerchantSchema, listMerchantsQuery, createBranchSchema } from '../models/merchant.model.js';

const router = express.Router();

// A merchant owner applies; an admin reviews.
router.post('/', requireRole('MERCHANT_OWNER'), validate(createMerchantSchema), controller.create);
router.get('/', requireRole('ADMIN'), validate(listMerchantsQuery, 'query'), controller.list);
router.patch('/:id/approve', requireRole('ADMIN'), validate(idParam, 'params'), controller.approve);
router.post(
  '/:id/branches',
  requireRole('MERCHANT_OWNER', 'MERCHANT_STAFF'),
  validate(idParam, 'params'),
  validate(createBranchSchema),
  controller.createBranch,
);

export default router;
