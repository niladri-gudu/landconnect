import { Router } from 'express';
import type { Prisma } from '@prisma/client';

import {
  listingCreateSchema,
  listingQuerySchema,
  listingUpdateSchema,
  type ListingDto,
} from '@landconnect/shared';

import { prisma } from '../lib/prisma';
import { AppError, requireAuth, requireRole } from '../lib/security';
import { toListingDto } from '../lib/serialize';

export const listingsRouter = Router();

const ownerSelect = {
  id: true,
  name: true,
  role: true,
  avatarUrl: true,
} as const;

async function findOwnedListing(id: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw new AppError(404, 'Listing not found');
  if (listing.ownerId !== userId) {
    throw new AppError(403, 'You can only manage your own listings');
  }
  return listing;
}

listingsRouter.get('/', async (req, res) => {
  const query = listingQuerySchema.parse(req.query);
  const where: Prisma.ListingWhereInput = { status: 'ACTIVE' };

  if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: 'insensitive' } },
      { description: { contains: query.q, mode: 'insensitive' } },
      { city: { contains: query.q, mode: 'insensitive' } },
    ];
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = { gte: query.minPrice, lte: query.maxPrice };
  }

  const [items, total] = await prisma.$transaction([
    prisma.listing.findMany({
      where,
      include: { owner: { select: ownerSelect } },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  const body: { items: ListingDto[]; page: number; pageSize: number; total: number } = {
    items: items.map(toListingDto),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
  res.json(body);
});

listingsRouter.get('/mine', requireAuth, async (req, res) => {
  const items = await prisma.listing.findMany({
    where: { ownerId: req.user!.id },
    include: { owner: { select: ownerSelect } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    items: items.map(toListingDto),
    page: 1,
    pageSize: items.length,
    total: items.length,
  });
});

listingsRouter.get('/:id', async (req, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: (req.params.id as string) },
    include: { owner: { select: ownerSelect } },
  });
  if (!listing) throw new AppError(404, 'Listing not found');
  res.json(toListingDto(listing));
});

listingsRouter.post(
  '/',
  requireAuth,
  requireRole('SELLER', 'BROKER'),
  async (req, res) => {
    const input = listingCreateSchema.parse(req.body);
    const listing = await prisma.listing.create({
      data: {
        ...input,
        status: input.status ?? 'ACTIVE',
        ownerId: req.user!.id,
      },
      include: { owner: { select: ownerSelect } },
    });
    res.status(201).json(toListingDto(listing));
  },
);

listingsRouter.patch(
  '/:id',
  requireAuth,
  requireRole('SELLER', 'BROKER'),
  async (req, res) => {
    const input = listingUpdateSchema.parse(req.body);
    await findOwnedListing((req.params.id as string), req.user!.id);
    const listing = await prisma.listing.update({
      where: { id: (req.params.id as string) },
      data: input,
      include: { owner: { select: ownerSelect } },
    });
    res.json(toListingDto(listing));
  },
);

listingsRouter.delete(
  '/:id',
  requireAuth,
  requireRole('SELLER', 'BROKER'),
  async (req, res) => {
    await findOwnedListing((req.params.id as string), req.user!.id);
    await prisma.listing.delete({ where: { id: (req.params.id as string) } });
    res.json({ ok: true });
  },
);
