import { env } from './src/config/env.js';
import app from './src/app.js';
import prisma from './src/config/prisma.js';

const server = app.listen(env.PORT, () => {
  console.log(`Delivery API listening on http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
