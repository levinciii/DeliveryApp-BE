import prisma from '../config/prisma.js';
import { notFound } from '../shared/errors.js';
import { pageArgs, pageResult } from '../shared/pagination.js';

// A branch is listed only when it can actually take orders: it and its merchant are approved
// and it has at least one active product.
const LISTED = {
  status: 'APPROVED',
  merchant: { status: 'APPROVED' },
  products: { some: { status: 'ACTIVE' } },
};

const include = {
  merchant: { select: { businessName: true } },
  _count: { select: { products: { where: { status: 'ACTIVE' } } } },
};

const branchDto = (b) => ({
  id: b.id,
  name: b.name,
  address: b.address,
  latitude: b.latitude,
  longitude: b.longitude,
  merchantName: b.merchant.businessName,
  productCount: b._count.products,
});

async function listBranches({ page, pageSize, search }) {
  const where = {
    ...LISTED,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { merchant: { businessName: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.merchantBranch.findMany({
      where,
      include,
      orderBy: [{ merchant: { businessName: 'asc' } }, { name: 'asc' }],
      ...pageArgs({ page, pageSize }),
    }),
    prisma.merchantBranch.count({ where }),
  ]);
  return pageResult(rows.map(branchDto), { page, pageSize }, total);
}

async function getBranch(branchId) {
  const branch = await prisma.merchantBranch.findFirst({ where: { id: branchId, ...LISTED }, include });
  if (!branch) throw notFound('Branch not found');
  return branchDto(branch);
}

export { listBranches, getBranch };
