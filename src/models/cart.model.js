import { z } from 'zod';

const setCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  // true = empty the cart first when it holds items from a different branch.
  replaceCart: z.boolean().default(false),
});

const productIdParam = z.object({ productId: z.string().uuid() });

export { setCartItemSchema, productIdParam };
