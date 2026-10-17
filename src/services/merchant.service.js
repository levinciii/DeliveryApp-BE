import prisma from '../config/prisma.js';
import { forbidden, notFound } from '../shared/errors.js';
import { pageArgs, pageResult } from '../shared/pagination.js';
import * as audit from './audit.service.js';

const merchantDto = (m) => ({
  id: m.id,
  businessName: m.businessName,
  status: m.status,
  ownerUserId: m.ownerUserId,
  branchCount: m._count.branches,
  createdAt: m.createdAt,
});

const branchDto = (b) => ({
  id: b.id,
  merchantId: b.merchantId,
  name: b.name,
  address: b.address,
  latitude: b.latitude,
  longitude: b.longitude,
  status: b.status,
  createdAt: b.createdAt,
});

const withBranchCount = { _count: { select: { branches: true } } };

async function createMerchant(userId, { businessName }) {
  const merchant = await prisma.merchantProfile.create({
    data: {
      businessName,
      ownerUserId: userId,
      members: { create: { userId, role: 'OWNER' } },
    },
    include: withBranchCount,
  });
  await audit.log(userId, 'merchant.apply', 'merchant', merchant.id);
  return merchantDto(merchant);
}

async function listMerchants({ page, pageSize, status }) {
  const where = status ? { status } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.merchantProfile.findMany({
      where,
      include: withBranchCount,
      orderBy: { createdAt: 'desc' },
      ...pageArgs({ page, pageSize }),
    }),
    prisma.merchantProfile.count({ where }),
  ]);
  return pageResult(rows.map(merchantDto), { page, pageSize }, total);
}

/** Approving a merchant also approves the branches it has already created. */
async function approveMerchant(adminId, merchantId) {
  const existing = await prisma.merchantProfile.findUnique({ where: { id: merchantId } });
  if (!existing) throw notFound('Merchant not found');

  const [merchant] = await prisma.$transaction([
    prisma.merchantProfile.update({
      where: { id: merchantId },
      data: { status: 'APPROVED' },
      include: withBranchCount,
    }),
    prisma.merchantBranch.updateMany({
      where: { merchantId, status: 'PENDING_APPROVAL' },
      data: { status: 'APPROVED' },
    }),
  ]);
  await audit.log(adminId, 'merchant.approve', 'merchant', merchantId, { from: existing.status });
  return merchantDto(merchant);
}

/** Returns the membership or throws 404 (a merchant you don't manage looks the same as one that doesn't exist). */
async function assertMember(merchantId, userId) {
  const membership = await prisma.merchantMember.findUnique({
    where: { merchantId_userId: { merchantId, userId } },
    include: { merchant: { select: { status: true } } },
  });
  if (!membership) throw notFound('Merchant not found');
  return membership;
}

async function createBranch(userId, merchantId, input) {
  const { merchant } = await assertMember(merchantId, userId);
  if (merchant.status === 'SUSPENDED' || merchant.status === 'REJECTED') {
    throw forbidden('This merchant cannot add branches');
  }
  const branch = await prisma.merchantBranch.create({
    data: {
      merchantId,
      ...input,
      // Branches of an already-approved merchant are live immediately.
      status: merchant.status === 'APPROVED' ? 'APPROVED' : 'PENDING_APPROVAL',
    },
  });
  await audit.log(userId, 'branch.create', 'branch', branch.id, { merchantId });
  return branchDto(branch);
}

export { createMerchant, listMerchants, approveMerchant, createBranch, assertMember };
