import { z } from 'zod';

const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  address: z.string().trim().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export { createAddressSchema };
