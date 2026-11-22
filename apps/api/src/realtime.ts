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
      const membership = await prisma.conversationParticipant
        .findUnique({
          where: {
            conversationId_userId: { conversationId, userId: user.id },
          },
        })
        .catch(() => null);
      if (membership) void socket.join(`conversation:${conversationId}`);
    });

    socket.on(SOCKET_EVENTS.conversationLeave, (conversationId: unknown) => {
      if (typeof conversationId === 'string') {
        void socket.leave(`conversation:${conversationId}`);
      }
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
