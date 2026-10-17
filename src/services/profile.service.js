import { Prisma } from '../generated/prisma/index.js';
import prisma from '../config/prisma.js';
import { conflict, notFound } from '../shared/errors.js';
import * as audit from './audit.service.js';

const select = { id: true, name: true, email: true, phone: true, role: true };

async function getProfile(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select });
  if (!user) throw notFound('User not found');
  return user;
}

async function updateProfile(userId, { name, phone }) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, ...(phone !== undefined ? { phone } : {}) },
      select,
    });
    await audit.log(userId, 'profile.update', 'user', userId);
    return user;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw conflict('Phone number is already in use');
    }
    throw e;
  }
}

export { getProfile, updateProfile };
