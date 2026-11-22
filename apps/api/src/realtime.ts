import type { Server } from 'socket.io';

import { SOCKET_EVENTS } from '@landconnect/shared';

import { prisma } from './lib/prisma';
import { verifyToken, type AuthUser } from './lib/security';

interface RelayPayload {
  conversationId?: unknown;
  [key: string]: unknown;
}

const RELAY_EVENTS: string[] = [
  SOCKET_EVENTS.typingStart,
  SOCKET_EVENTS.typingStop,
  SOCKET_EVENTS.webrtcOffer,
  SOCKET_EVENTS.webrtcAnswer,
  SOCKET_EVENTS.webrtcIce,
];

async function isMember(conversationId: string, userId: string) {
  const membership = await prisma.conversationParticipant
    .findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    .catch(() => null);
  return Boolean(membership);
}

/**
 * Authenticated realtime layer:
 *  - each socket joins a private `user:<id>` room for incoming-call events
 *  - conversation rooms are joined only after a membership check
 *  - typing + WebRTC signalling payloads are relayed to the other side
 */
export function attachRealtime(io: Server) {
  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers.authorization?.replace('Bearer ', '');
    const token = (authToken ?? headerToken) as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser;
    void socket.join(`user:${user.id}`);

    socket.on(SOCKET_EVENTS.conversationJoin, async (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return;
      if (await isMember(conversationId, user.id)) {
        void socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on(SOCKET_EVENTS.conversationLeave, (conversationId: unknown) => {
      if (typeof conversationId === 'string') {
        void socket.leave(`conversation:${conversationId}`);
      }
    });

    /** Recipient's app acknowledges that it received these messages. */
    const markDelivered = async (payload: unknown) => {
      if (typeof payload !== 'object' || payload === null) return;
      const data = payload as { conversationId?: unknown; messageIds?: unknown };
      const conversationId =
        typeof data.conversationId === 'string' ? data.conversationId : null;
      const messageIds = Array.isArray(data.messageIds)
        ? data.messageIds.filter((id): id is string => typeof id === 'string')
        : [];
      if (!conversationId || messageIds.length === 0) return;
      if (!(await isMember(conversationId, user.id))) return;

      const messages = await prisma.message.findMany({
        where: {
          id: { in: messageIds },
          conversationId,
          senderId: { not: user.id },
          deliveredAt: null,
        },
        select: { id: true, senderId: true },
      });
      if (messages.length === 0) return;

      const at = new Date();
      await prisma.message.updateMany({
        where: { id: { in: messages.map((message) => message.id) } },
        data: { deliveredAt: at },
      });

      const receipt = {
        conversationId,
        messageIds: messages.map((message) => message.id),
        at: at.toISOString(),
      };
      for (const senderId of new Set(messages.map((message) => message.senderId))) {
        io.to(`user:${senderId}`).emit(SOCKET_EVENTS.messageDelivered, receipt);
      }
    };

    /** Recipient has the conversation open; mark everything from the other side read. */
    const markRead = async (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return;
      if (!(await isMember(conversationId, user.id))) return;

      const unread = await prisma.message.findMany({
        where: { conversationId, senderId: { not: user.id }, readAt: null },
        select: { id: true, senderId: true },
      });
      if (unread.length === 0) return;

      const at = new Date();
      await prisma.message.updateMany({
        where: { id: { in: unread.map((message) => message.id) } },
        data: { readAt: at, deliveredAt: at },
      });

      const receipt = {
        conversationId,
        messageIds: unread.map((message) => message.id),
        at: at.toISOString(),
      };
      for (const senderId of new Set(unread.map((message) => message.senderId))) {
        io.to(`user:${senderId}`).emit(SOCKET_EVENTS.messageRead, receipt);
      }
    };

    socket.on(SOCKET_EVENTS.messageDelivered, (payload: unknown) => {
      void markDelivered(payload).catch(() => {});
    });

    socket.on(SOCKET_EVENTS.conversationRead, (conversationId: unknown) => {
      void markRead(conversationId).catch(() => {});
    });

    for (const event of RELAY_EVENTS) {
      socket.on(event, (payload: RelayPayload) => {
        const conversationId =
          typeof payload?.conversationId === 'string' ? payload.conversationId : null;
        if (!conversationId) return;
        if (!socket.rooms.has(`conversation:${conversationId}`)) return;
        socket.to(`conversation:${conversationId}`).emit(event, {
          ...payload,
          from: user.id,
        });
      });
    }
  });
}
