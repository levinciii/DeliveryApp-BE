import express from 'express';
import * as controller from '../controllers/address.controller.js';
import requireRole from '../middlewares/requireRole.js';
import validate from '../middlewares/validate.js';
import { createAddressSchema } from '../models/address.model.js';
import { idParam } from '../models/common.model.js';

const router = express.Router();

router.use(requireRole('CUSTOMER'));
router.get('/', controller.list);
router.post('/', validate(createAddressSchema), controller.create);
router.delete('/:id', validate(idParam, 'params'), controller.remove);

export default router;
