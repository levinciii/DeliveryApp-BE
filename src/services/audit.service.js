import prisma from '../config/prisma.js';

/** Records who did what. Never put secrets (passwords, TINs) in `meta`. */
async function log(userId, action, entity, entityId, meta) {
  await prisma.auditLog.create({ data: { userId, action, entity, entityId, meta } });
}

export { log };
