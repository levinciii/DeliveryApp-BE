import express from 'express';
import * as controller from '../controllers/auth.controller.js';
import validate from '../middlewares/validate.js';
import { registerSchema, loginSchema, refreshSchema } from '../models/auth.model.js';

const router = express.Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', validate(refreshSchema), controller.logout);

export default router;
