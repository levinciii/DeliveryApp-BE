import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Order pricing (PHP). These are placeholder defaults, not market rates: set your own in .env.
  DELIVERY_BASE_FEE: z.coerce.number().nonnegative().default(40),
  DELIVERY_FEE_PER_KM: z.coerce.number().nonnegative().default(10),
  SERVICE_FEE: z.coerce.number().nonnegative().default(10),
  MAX_DELIVERY_KM: z.coerce.number().positive().default(15),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
