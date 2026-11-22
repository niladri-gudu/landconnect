import { Router } from 'express';
import type { Server } from 'socket.io';

import {
  conversationCreateSchema,
  messageCreateSchema,
  SOCKET_EVENTS,
} from '@landconnect/shared';

import { prisma } from '../lib/prisma';
import { AppError, requireAuth } from '../lib/security';
import { toConversationDto, toMessageDto } from '../lib/serialize';

export const conversationsRouter = Router();

const conversationInclude = {
  listing: { select: { title: true } },
  participants: {
    include: {
      user: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  },
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
};

async function assertMember(conversationId: string, userId: string) {
  const membership = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (!membership) throw new AppError(403, 'Not a participant in this conversation');
}

conversationsRouter.get('/', requireAuth, async (req, res) => {
  const me = req.user!.id;
  const rows = await prisma.conversation.findMany({
    where: { participants: { some: { userId: me } } },
    orderBy: { lastMessageAt: 'desc' },
    include: conversationInclude,
  });

  const ids = rows.map((row) => row.id);
  const counts =
    ids.length === 0
      ? []
      : await prisma.message.groupBy({
          by: ['conversationId'],
          where: { conversationId: { in: ids }, senderId: { not: me }, readAt: null },
          _count: { _all: true },
        });
  const unreadByConversation = new Map(
    counts.map((row) => [row.conversationId, row._count._all]),
  );

  res.json(
    rows.map((row) => toConversationDto(row, unreadByConversation.get(row.id) ?? 0)),
  );
});

conversationsRouter.post('/', requireAuth, async (req, res) => {
  const input = conversationCreateSchema.parse(req.body);
  const me = req.user!.id;

  if (input.participantId === me) {
    throw new AppError(400, 'You cannot start a conversation with yourself');
  }

  const [listing, participant] = await Promise.all([
    prisma.listing.findUnique({ where: { id: input.listingId } }),
    prisma.user.findUnique({ where: { id: input.participantId } }),
  ]);
  if (!listing) throw new AppError(404, 'Listing not found');
  if (!participant) throw new AppError(404, 'Participant not found');

  const existing = await prisma.conversation.findFirst({
    where: {
      listingId: input.listingId,
      AND: [
        { participants: { some: { userId: me } } },
        { participants: { some: { userId: input.participantId } } },
      ],
    },
    include: conversationInclude,
  });
  if (existing) {
    res.json(toConversationDto(existing));
    return;
  }

  const created = await prisma.conversation.create({
    data: {
      listingId: input.listingId,
      participants: {
        create: [{ userId: me }, { userId: input.participantId }],
      },
    },
    include: conversationInclude,
  });
  res.status(201).json(toConversationDto(created));
});

conversationsRouter.get('/:id', requireAuth, async (req, res) => {
  const conversationId = req.params.id as string;
  const me = req.user!.id;
  await assertMember(conversationId, me);

  const row = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude,
  });
  if (!row) throw new AppError(404, 'Conversation not found');

  const unreadCount = await prisma.message.count({
    where: { conversationId, senderId: { not: me }, readAt: null },
  });
  res.json(toConversationDto(row, unreadCount));
});

conversationsRouter.get('/:id/messages', requireAuth, async (req, res) => {
  const conversationId = req.params.id as string;
  const me = req.user!.id;
  await assertMember(conversationId, me);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  // Fetching history counts as delivery for messages from the other side.
  const pending = messages.filter(
    (message) => message.senderId !== me && message.deliveredAt === null,
  );
  if (pending.length > 0) {
    const at = new Date();
    await prisma.message.updateMany({
      where: { id: { in: pending.map((message) => message.id) } },
      data: { deliveredAt: at },
    });

    const io = req.app.get('io') as Server | undefined;
    const receipt = {
      conversationId,
      messageIds: pending.map((message) => message.id),
      at: at.toISOString(),
    };
    for (const senderId of new Set(pending.map((message) => message.senderId))) {
      io?.to(`user:${senderId}`).emit(SOCKET_EVENTS.messageDelivered, receipt);
    }
  }

  res.json(messages.map(toMessageDto));
});

conversationsRouter.post('/:id/messages', requireAuth, async (req, res) => {
  const input = messageCreateSchema.parse(req.body);
  const conversationId = req.params.id as string;
  await assertMember(conversationId, req.user!.id);

  const created = await prisma.message.create({
    data: {
      conversationId,
      senderId: req.user!.id,
      body: input.body,
      type: input.type,
    },
  });

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: created.createdAt },
    select: { participants: { select: { userId: true } } },
  });

  const io = req.app.get('io') as Server | undefined;
  const dto = toMessageDto(created);

  // Conversation room feeds open chat screens. User rooms feed the messages
  // list even when the recipient is on another tab. Clients dedupe by id.
  io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.messageNew, dto);
  for (const participant of conversation.participants) {
    io?.to(`user:${participant.userId}`).emit(SOCKET_EVENTS.messageNew, dto);
  }

  res.status(201).json(dto);
});
