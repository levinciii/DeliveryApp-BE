import { z } from 'zod';

const createCategorySchema = z.object({ name: z.string().trim().min(2).max(60) });

export { createCategorySchema };
