import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  // Omit to leave unchanged, send null to clear.
  phone: z.string().trim().min(7).max(20).nullable().optional(),
});

export { updateProfileSchema };
