import express from 'express';
import * as controller from '../controllers/category.controller.js';
import requireRole from '../middlewares/requireRole.js';
import validate from '../middlewares/validate.js';
import { createCategorySchema } from '../models/category.model.js';

const router = express.Router();

router.get('/', controller.list);
router.post('/', requireRole('ADMIN'), validate(createCategorySchema), controller.create);

export default router;
