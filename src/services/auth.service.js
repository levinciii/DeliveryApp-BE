import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '../generated/prisma/index.js';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { conflict, forbidden, unauthorized } from '../shared/errors.js';
import * as audit from './audit.service.js';

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// Used to keep login timing similar whether or not the email exists.
const dummyHash = argon2.hash('dummy-password-for-timing', { type: argon2.argon2id });

const userDto = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

async function issueTokens(user) {
  const accessToken = jwt.sign({ email: user.email, role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TTL_SECONDS,
    algorithm: 'HS256',
  });
  const refreshToken = randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86_400_000),
    },
  });
  return { accessToken, refreshToken, expiresIn: env.ACCESS_TTL_SECONDS };
}

async function register({ email, password, name, role }) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  let user;
  try {
    // Riders get their rider profile in the same atomic write as the user row.
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        ...(role === 'RIDER' ? { riderProfile: { create: {} } } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw conflict('Email is already registered');
    }
    throw e;
  }
  await audit.log(user.id, 'auth.register', 'user', user.id, { role });
  return { user: userDto(user), ...(await issueTokens(user)) };
}

async function login({ email, password }) {
  const row = await prisma.user.findUnique({ where: { email } });
  const hash = row ? row.passwordHash : await dummyHash;
  const ok = await argon2.verify(hash, password).catch(() => false);
  if (!row || !ok) {
    await audit.log(row ? row.id : null, 'auth.login_failed', 'user', row ? row.id : undefined);
    throw unauthorized('Invalid email or password');
  }
  // Checked after the password so a suspended account can't be probed without the password.
  if (row.status === 'SUSPENDED') {
    await audit.log(row.id, 'auth.login_blocked', 'user', row.id);
    throw forbidden('This account has been suspended');
  }
  await audit.log(row.id, 'auth.login', 'user', row.id);
  return { user: userDto(row), ...(await issueTokens(row)) };
}

/** Rotating refresh tokens with reuse detection: presenting a revoked token revokes the user's whole session set. */
async function refresh(refreshToken) {
  const token = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) } });
  if (!token) throw unauthorized('Invalid refresh token');

  if (token.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: token.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit.log(token.userId, 'auth.refresh_reuse_detected', 'user', token.userId);
    throw unauthorized('Invalid refresh token');
  }
  if (token.expiresAt <= new Date()) throw unauthorized('Invalid refresh token');

  // Conditional update makes rotation safe against two simultaneous refreshes.
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: token.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count !== 1) throw unauthorized('Invalid refresh token');

  const user = await prisma.user.findUnique({
    where: { id: token.userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!user || user.status === 'SUSPENDED') throw unauthorized('Invalid refresh token');
  return issueTokens(user);
}

async function logout(refreshToken) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export { register, login, refresh, logout };
