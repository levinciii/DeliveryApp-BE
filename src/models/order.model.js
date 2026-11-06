import { z } from 'zod';
import { pagination } from './common.model.js';

const orderStatus = z.enum([
  'PENDING',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'DELIVERED',
  'CANCELLED',
  'REJECTED',
]);

const quoteSchema = z.object({ addressId: z.string().uuid() });

const placeOrderSchema = z.object({
  addressId: z.string().uuid(),
  // Cash on delivery only for now; online methods arrive with the payment-gateway phase.
  paymentMethod: z.enum(['COD']).default('COD'),
  notes: z.string().trim().max(200).optional(),
});

const listOrdersQuery = pagination.extend({ status: orderStatus.optional() });

// Only statuses a person can set; PICKED_UP and DELIVERED belong to the dispatch phase.
const updateOrderStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'CANCELLED']),
});

export { quoteSchema, placeOrderSchema, listOrdersQuery, updateOrderStatusSchema };
