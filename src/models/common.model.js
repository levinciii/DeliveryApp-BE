import { z } from 'zod';

/** Accepts 1234.5 or "1234.50"; always yields a string with at most 2 decimals. */
const moneyAmount = z.preprocess(
  (v) => (typeof v === 'number' ? String(v) : v),
  z.string().regex(/^\d{1,12}(\.\d{1,2})?$/, 'Invalid amount (max 2 decimal places)'),
);

const idParam = z.object({ id: z.string().uuid() });

/** ?page=1&pageSize=20 (pageSize is capped at 100). */
const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export { moneyAmount, idParam, pagination };
