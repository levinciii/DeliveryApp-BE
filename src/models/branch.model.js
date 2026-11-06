import { z } from 'zod';
import { pagination } from './common.model.js';

// ?search= matches the branch name or the business name (case-insensitive).
const listBranchesQuery = pagination.extend({ search: z.string().trim().max(60).optional() });

export { listBranchesQuery };
