import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const CATEGORIES = [
  'Meals',
  'Fast food',
  'Beverages',
  'Desserts & bakery',
  'Groceries',
  'Fresh produce',
  'Medicine',
  'Health & wellness',
  'Pet supplies',
  'Household',
];

async function seedCategories() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

// Admin accounts can't be created through the API. Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD
// in .env (password 10+ characters) and run `npm run db:seed` to create or promote one.
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('Skipped admin: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env to create one');
    return;
  }
  if (password.length < 10) throw new Error('SEED_ADMIN_PASSWORD must be at least 10 characters');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    console.log(`Promoted existing user ${email} to ADMIN (password unchanged)`);
    return;
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.create({ data: { email, passwordHash, name: 'Administrator', role: 'ADMIN' } });
  console.log(`Created admin ${email}`);
}

try {
  await seedCategories();
  await seedAdmin();
} finally {
  await prisma.$disconnect();
}
