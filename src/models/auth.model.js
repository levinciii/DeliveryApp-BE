import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(128),
  name: z.string().trim().min(2).max(120),
  // Admin accounts are never created through the API (see `npm run db:seed`).
  role: z.enum(['CUSTOMER', 'MERCHANT_OWNER', 'RIDER']).default('CUSTOMER'),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({ refreshToken: z.string().min(20) });

export { registerSchema, loginSchema, refreshSchema };
