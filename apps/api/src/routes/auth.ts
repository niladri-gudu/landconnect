import bcrypt from 'bcryptjs';
import { Router } from 'express';
import type { User } from '@prisma/client';

import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  type AuthResponse,
  type Role,
} from '@landconnect/shared';

import { env } from '../env';
import { prisma } from '../lib/prisma';
import {
  AppError,
  generateRefreshToken,
  hashRefreshToken,
  requireAuth,
  signToken,
} from '../lib/security';
import { toUserDto } from '../lib/serialize';

export const authRouter = Router();

function refreshExpiry(): Date {
  return new Date(Date.now() + env.refreshTokenTtlDays * 86_400_000);
}

function accessTokenFor(user: User): string {
  return signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  });
}

/** Issues a short-lived access token plus a rotating, hashed-at-rest refresh token. */
async function issueSession(user: User): Promise<AuthResponse> {
  const refreshToken = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiry(),
    },
  });

  return {
    accessToken: accessTokenFor(user),
    refreshToken,
    user: toUserDto(user),
  };
}

authRouter.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      passwordHash: await bcrypt.hash(input.password, 10),
    },
  });

  res.status(201).json(await issueSession(user));
});

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password');
  }

  res.json(await issueSession(user));
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = refreshTokenSchema.parse(req.body);
  const tokenHash = hashRefreshToken(refreshToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored) throw new AppError(401, 'Invalid refresh token');

  // Reuse of a rotated token means it likely leaked — revoke the whole family.
  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, 'Refresh token reuse detected — all sessions revoked');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    throw new AppError(401, 'Refresh token expired');
  }

  const nextRefreshToken = generateRefreshToken();
  const nextTokenHash = hashRefreshToken(nextRefreshToken);

  // Atomic claim: only one concurrent refresh can rotate this token.
  const claimed = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date(), replacedByTokenHash: nextTokenHash },
  });
  if (claimed.count === 0) {
    throw new AppError(401, 'Refresh token already used');
  }

  await prisma.refreshToken.create({
    data: {
      userId: stored.userId,
      tokenHash: nextTokenHash,
      expiresAt: refreshExpiry(),
    },
  });

  const body: AuthResponse = {
    accessToken: accessTokenFor(stored.user),
    refreshToken: nextRefreshToken,
    user: toUserDto(stored.user),
  };
  res.json(body);
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = logoutSchema.parse(req.body);
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) throw new AppError(404, 'User not found');
  res.json(toUserDto(user));
});
