import { randomUUID } from 'node:crypto';

import { Router } from 'express';
import type { Server } from 'socket.io';

import {
  callAnswerSchema,
  callCreateSchema,
  SOCKET_EVENTS,
  type CallAnswerDto,
  type CallDto,
} from '@landconnect/shared';

import { prisma } from '../lib/prisma';
import { createLivekitGrant } from '../lib/livekit';
import { AppError, requireAuth } from '../lib/security';
import { toCallDto } from '../lib/serialize';

export const callsRouter = Router();

async function findCallForUser(id: string, userId: string) {
  const call = await prisma.callSession.findUnique({ where: { id } });
  if (!call) throw new AppError(404, 'Call not found');
  if (call.initiatorId !== userId && call.receiverId !== userId) {
    throw new AppError(403, 'Not a participant in this call');
  }
  return call;
}

function emitCallEvent(
  req: Parameters<Parameters<Router['post']>[1]>[0],
  call: CallDto,
  event: string,
) {
  const io = req.app.get('io') as Server | undefined;
  const rooms = [
    `conversation:${call.conversationId}`,
    `user:${call.initiatorId}`,
    `user:${call.receiverId}`,
  ];
  for (const room of rooms) {
    io?.to(room).emit(event, call);
  }
}

callsRouter.post('/', requireAuth, async (req, res) => {
  const input = callCreateSchema.parse(req.body);
  const me = req.user!.id;

  const members = await prisma.conversationParticipant.findMany({
    where: { conversationId: input.conversationId },
  });
  if (!members.some((member) => member.userId === me)) {
    throw new AppError(403, 'Not a participant in this conversation');
  }
  const other = members.find((member) => member.userId !== me);
  if (!other) throw new AppError(400, 'No other participant to call');

  const call = await prisma.callSession.create({
    data: {
      conversationId: input.conversationId,
      initiatorId: me,
      receiverId: other.userId,
      kind: input.kind,
      roomName: `landconnect-${randomUUID()}`,
    },
  });

  const dto = toCallDto(call);
  const io = req.app.get('io') as Server | undefined;
  io?.to(`user:${other.userId}`).emit(SOCKET_EVENTS.callIncoming, dto);
  io?.to(`conversation:${input.conversationId}`).emit(SOCKET_EVENTS.callIncoming, dto);

  res.status(201).json(dto);
});

callsRouter.get('/:id', requireAuth, async (req, res) => {
  const call = await findCallForUser((req.params.id as string), req.user!.id);
  res.json(toCallDto(call));
});

callsRouter.get('/:id/token', requireAuth, async (req, res) => {
  const call = await findCallForUser((req.params.id as string), req.user!.id);
  if (call.status !== 'ACTIVE') {
    throw new AppError(409, 'Call is not active yet');
  }
  const grant = await createLivekitGrant(req.user!.id, req.user!.name, call.roomName);
  if (!grant) throw new AppError(503, 'LiveKit is not configured on this server');
  res.json(grant);
});

callsRouter.post('/:id/answer', requireAuth, async (req, res) => {
  const call = await findCallForUser((req.params.id as string), req.user!.id);
  if (call.receiverId !== req.user!.id) {
    throw new AppError(403, 'Only the receiver can answer this call');
  }
  if (call.status !== 'RINGING') {
    throw new AppError(409, `Call is already ${call.status.toLowerCase()}`);
  }

  const { accept } = callAnswerSchema.parse(req.body);

  if (!accept) {
    const rejected = await prisma.callSession.update({
      where: { id: call.id },
      data: { status: 'REJECTED', endedAt: new Date() },
    });
    emitCallEvent(req, toCallDto(rejected), SOCKET_EVENTS.callRejected);
    const body: CallAnswerDto = { call: toCallDto(rejected) };
    res.json(body);
    return;
  }

  const active = await prisma.callSession.update({
    where: { id: call.id },
    data: { status: 'ACTIVE', startedAt: new Date() },
  });
  emitCallEvent(req, toCallDto(active), SOCKET_EVENTS.callAccepted);

  const livekit = await createLivekitGrant(req.user!.id, req.user!.name, call.roomName);
  const body: CallAnswerDto = {
    call: toCallDto(active),
    livekit: livekit ?? undefined,
  };
  res.json(body);
});

callsRouter.post('/:id/end', requireAuth, async (req, res) => {
  const call = await findCallForUser((req.params.id as string), req.user!.id);

  if (call.status === 'ENDED' || call.status === 'REJECTED') {
    res.json(toCallDto(call));
    return;
  }

  const ended = await prisma.callSession.update({
    where: { id: call.id },
    data: { status: 'ENDED', endedAt: new Date() },
  });
  emitCallEvent(req, toCallDto(ended), SOCKET_EVENTS.callEnded);

  res.json(toCallDto(ended));
});
