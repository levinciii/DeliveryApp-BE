import prisma from '../config/prisma.js';
import { badRequest, notFound } from '../shared/errors.js';
import * as audit from './audit.service.js';

const MAX_ADDRESSES = 10;
const select = { id: true, label: true, address: true, latitude: true, longitude: true };

const listAddresses = (userId) =>
  prisma.address.findMany({ where: { userId }, select, orderBy: { createdAt: 'asc' } });

async function createAddress(userId, input) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_ADDRESSES) throw badRequest(`You can save up to ${MAX_ADDRESSES} addresses`);
  const address = await prisma.address.create({ data: { userId, ...input }, select });
  await audit.log(userId, 'address.create', 'address', address.id);
  return address;
}

async function deleteAddress(userId, addressId) {
  // Orders keep their own copy of the delivery address, so deleting a saved one is always safe.
  const { count } = await prisma.address.deleteMany({ where: { id: addressId, userId } });
  if (count === 0) throw notFound('Address not found');
  await audit.log(userId, 'address.delete', 'address', addressId);
}

export { listAddresses, createAddress, deleteAddress };
