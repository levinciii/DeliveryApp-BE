import { Prisma } from '../generated/prisma/index.js';
import prisma from '../config/prisma.js';
import { conflict } from '../shared/errors.js';
import * as audit from './audit.service.js';

const select = { id: true, name: true };

const listCategories = () => prisma.category.findMany({ select, orderBy: { name: 'asc' } });

async function createCategory(userId, { name }) {
  try {
    const category = await prisma.category.create({ data: { name }, select });
    await audit.log(userId, 'category.create', 'category', category.id);
    return category;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw conflict('Category already exists');
    }
    throw e;
  }
}

export { listCategories, createCategory };
