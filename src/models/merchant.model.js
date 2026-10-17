import { z } from 'zod';
import { pagination } from './common.model.js';

const merchantStatus = z.enum(['PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'REJECTED']);

const createMerchantSchema = z.object({ businessName: z.string().trim().min(2).max(120) });

const listMerchantsQuery = pagination.extend({ status: merchantStatus.optional() });

const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export { createMerchantSchema, listMerchantsQuery, createBranchSchema };
