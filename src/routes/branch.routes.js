import express from 'express';
import * as controller from '../controllers/branch.controller.js';
import validate from '../middlewares/validate.js';
import { listBranchesQuery } from '../models/branch.model.js';
import { idParam } from '../models/common.model.js';

const router = express.Router();

// The customer-facing directory. Any signed-in user can browse it.
router.get('/', validate(listBranchesQuery, 'query'), controller.list);
router.get('/:id', validate(idParam, 'params'), controller.get);

export default router;
