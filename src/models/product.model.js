import { z } from 'zod';
import { moneyAmount, pagination } from './common.model.js';

const listProductsQuery = pagination.extend({ branchId: z.string().uuid() });

const createProductSchema = z.object({
  branchId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  price: moneyAmount,
});

// PUT replaces the editable fields: name and price are required, the rest are optional.
const updateProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: moneyAmount,
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(['ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).optional(),
});

export { listProductsQuery, createProductSchema, updateProductSchema };
