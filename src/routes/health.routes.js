import express from 'express';
import * as controller from '../controllers/health.controller.js';

const router = express.Router();

router.get('/', controller.check);

export default router;
