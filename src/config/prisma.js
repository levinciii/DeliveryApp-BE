import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';
import { env } from './env.js';

// One shared Prisma client for the whole app (Rust-free client + node-postgres adapter).
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

export default prisma;
