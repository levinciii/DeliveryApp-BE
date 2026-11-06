import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { apiLimiter, authLimiter } from '../middlewares/rateLimit.js';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import categoryRoutes from './category.routes.js';
import merchantRoutes from './merchant.routes.js';
import branchRoutes from './branch.routes.js';
import productRoutes from './product.routes.js';
import addressRoutes from './address.routes.js';
import cartRoutes from './cart.routes.js';
import orderRoutes from './order.routes.js';

const router = express.Router();

router.use('/health', healthRoutes);
router.use(apiLimiter);

// Public
router.use('/auth', authLimiter, authRoutes);

// Everything below requires a valid access token
router.use(authenticate);
router.use('/profile', profileRoutes);
router.use('/categories', categoryRoutes);
router.use('/merchants', merchantRoutes);
router.use('/branches', branchRoutes);
router.use('/products', productRoutes);
router.use('/addresses', addressRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);

export default router;
