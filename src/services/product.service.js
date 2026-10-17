import prisma from '../config/prisma.js';
import { badRequest, notFound } from '../shared/errors.js';
import { money } from '../shared/money.js';
import { pageArgs, pageResult } from '../shared/pagination.js';
import * as audit from './audit.service.js';
import { assertMember } from './merchant.service.js';

const productDto = (p) => ({
  id: p.id,
  branchId: p.branchId,
  categoryId: p.categoryId,
  name: p.name,
  price: money(p.price),
  status: p.status,
});

async function assertCategoryExists(categoryId) {
  if (!categoryId) return;
  const found = await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (!found) throw badRequest('Unknown categoryId');
}

/** Customer-facing catalog: only ACTIVE products of APPROVED branches. */
async function listProducts({ branchId, page, pageSize }) {
  const where = { branchId, status: 'ACTIVE', branch: { status: 'APPROVED' } };
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs({ page, pageSize }) }),
    prisma.product.count({ where }),
  ]);
  return pageResult(rows.map(productDto), { page, pageSize }, total);
}

async function createProduct(userId, { branchId, categoryId, name, price }) {
  const branch = await prisma.merchantBranch.findUnique({ where: { id: branchId } });
  if (!branch) throw notFound('Branch not found');
  await assertMember(branch.merchantId, userId);
  await assertCategoryExists(categoryId);

  const product = await prisma.product.create({
    data: { branchId, categoryId, name, price, inventory: { create: {} } },
  });
  await audit.log(userId, 'product.create', 'product', product.id, { branchId });
  return productDto(product);
}

async function updateProduct(userId, productId, { name, price, categoryId, status }) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { branch: { select: { merchantId: true } } },
  });
  if (!existing) throw notFound('Product not found');
  await assertMember(existing.branch.merchantId, userId);
  if (categoryId) await assertCategoryExists(categoryId);

  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      price,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  });
  await audit.log(userId, 'product.update', 'product', productId);
  return productDto(product);
}

export { listProducts, createProduct, updateProduct };
