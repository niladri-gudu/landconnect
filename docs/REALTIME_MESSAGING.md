# Realtime Messaging

**Baseline:** 2026-11-21
**Source:** `apps/api/src/realtime.ts`, `apps/api/src/routes/conversations.ts`, `apps/mobile/src/lib/socket.ts`, `apps/mobile/src/app/chat/[conversationId].tsx`
**Related:** [API_SPEC.md](API_SPEC.md) · [AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) · [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

---

## 1. Why Socket.IO

One authenticated channel carries all realtime concerns:

- chat messages and typing
- call lifecycle events
- WebRTC offer/answer/ICE relay

Rooms map to conversations and per-user inboxes, reconnection is built in, and the transport
degrades to HTTP polling if WebSockets are blocked. The client is configured with
`transports: ['websocket']` for predictable behaviour.

## 2. Connection and authentication

```ts
// mobile
socket = io(API_URL, {
  transports: ['websocket'],
  auth: (callback) => callback({ token: getAccessToken() ?? '' }),
  reconnection: true,
  reconnectionAttempts: 10,
});
```

```ts
// server
io.use((socket, next) => {
  const token = socket.handshake.auth?.token
    ?? socket.handshake.headers.authorization?.replace('Bearer ', '');
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.data.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});
```

The auth **callback** re-reads the latest access token on every reconnect, so a rotation does not
leave the socket stranded with an expired token. A failed handshake surfaces as
`connect_error` to the client.

## 3. Rooms

| Room | Joined when | Purpose |
|---|---|---|
| `user:<userId>` | automatically on connect | Incoming calls reach the user anywhere |
| `conversation:<conversationId>` | after a membership check | Chat fan-out, typing, WebRTC relay |

Membership check:

```ts
const membership = await prisma.conversationParticipant.findUnique({
  where: { conversationId_userId: { conversationId, userId: user.id } },
});
if (membership) socket.join(`conversation:${conversationId}`);
```

A non-member's join is silently ignored. The client cannot self-assign rooms.

## 4. Event catalog

| Event | Direction | Payload | Notes |
|---|---|---|---|
| `conversation:join` | C → S | `conversationId: string` | Membership-checked; no ack |
| `conversation:leave` | C → S | `conversationId: string` | Leaves room |
| `message:new` | S → C | `MessageDto` | Emitted after `POST /messages` |
| `typing:start` | C → S → C | `{ conversationId }` + `from` | Relayed to room; client not emitting yet |
| `typing:stop` | C → S → C | `{ conversationId }` + `from` | Same |
| `call:incoming` | S → C | `CallDto` | To `user:<receiver>` and conversation room |
| `call:accepted` | S → C | `CallDto` | Conversation room |
| `call:rejected` | S → C | `CallDto` | Conversation room |
| `call:ended` | S → C | `CallDto` | Conversation room |
| `webrtc:offer` | C → S → C | `{ conversationId, sdp, … }` + `from` | Relay to room; requires room membership |
| `webrtc:answer` | C → S → C | `{ conversationId, sdp, … }` + `from` | Same |
| `webrtc:ice` | C → S → C | `{ conversationId, candidate, … }` + `from` | Same |

Event names come from `SOCKET_EVENTS` in `packages/shared/src/constants.ts`; both sides import the
same object, so a typo is a TypeScript error.

## 5. Message flow

```
Sender                               Server                              Receiver
  │ POST /conversations/:id/messages   │                                    │
  ├───────────────────────────────────▶│ assertMember                       │
  │                                   │ create Message                     │
  │                                   │ update Conversation.lastMessageAt  │
  │                                   │ io.to(conversation).emit(          │
  │                                   │   'message:new', dto)              │
  │ 201 MessageDto                    │───────────────────────────────────▶│ append if new id
  │ append if new id                  │                                    │
```

Why both REST and socket for sending? HTTP gives a reliable ack and a persisted id; the socket
only fans out the persisted message. Sending over the socket without an ack would require
custom delivery tracking. The trade-off is one extra round trip, acceptable at this scale.

**De-duplication:** the sender appends the 201 response and also receives `message:new`; the
screen checks `prev.some(m => m.id === message.id)` before appending.

## 6. Typing indicators

The server already supports it:

```ts
for (const event of [SOCKET_EVENTS.typingStart, SOCKET_EVENTS.typingStop]) {
  socket.on(event, (payload) => {
    if (!payload?.conversationId) return;
    if (!socket.rooms.has(`conversation:${payload.conversationId}`)) return;
    socket.to(`conversation:${payload.conversationId}`).emit(event, {
      ...payload,
      from: user.id,
    });
  });
}
```

Client work remaining:

1. On input change, emit `typing:start` throttled to once every 2–3 s.
2. Emit `typing:stop` on empty input, send, blur, or a 3 s idle timer.
3. Render "typing…" in the chat header; ignore events with `from === user.id`.

## 7. WebRTC relay

The relay is a dumb, membership-gated pipe:

- Accepts only `conversationId`-scoped payloads.
- Requires the socket to already be in the conversation room.
- Re-emits to everyone else in the room with `from: user.id`.
- The client must ignore its own `from` and apply only the peer's SDP/ICE.

This is enough for a P2P handshake but **does not carry media**. See
[AUDIO_VIDEO_CALLING.md](AUDIO_VIDEO_CALLING.md) §5.

## 8. Meeting rooms

The brief asks for "basic meeting-room functionality". This prototype treats each conversation
as a persistent room:

- Participants are fixed at conversation creation.
- The room survives app restarts (it is a database row).
- Chat and calls share the same room identity.
- No scheduling, waiting room, or multi-party support.

This is a defensible prototype interpretation: buyers and sellers get a private, persistent space
to meet, chat and call. A production "meeting room" could add a `Meeting` model linked to a
conversation, with start time, duration and a LiveKit room per meeting.

## 9. Delivery semantics

| Aspect | Current behaviour |
|---|---|
| Transport | WebSocket only |
| Message persistence | Yes, before fan-out |
| Ack | HTTP 201 for sender |
| Ordering | Server `createdAt`, ascending history |
| At-least-once | Effectively yes for the sender retry; client dedupes by id |
| Offline queue | None; missed messages are fetched from history on open |
| Read receipts | None |
| Presence | None |
| Typing | Server ready, client not wired |
| History limit | Oldest 200 messages (KI-10) |

## 10. Reconnection

Socket.IO retries up to 10 times. On reconnect:

- Handshake uses the latest access token via the auth callback.
- The chat screen's effect re-emits `conversation:join` only if the component remounts; a socket
  reconnect does **not** automatically re-join rooms server-side. Socket.IO rooms are lost when a
  socket disconnects.

**Fix before demo:** on `socket.on('connect')`, re-emit `conversation:join` for the active
conversation, or move the join into the connect handler. Without this, chat stops updating after
a network blip until the screen is reopened.

## 11. Scaling

Current: single API instance, in-memory rooms.

To scale horizontally:

1. Add `@socket.io/redis-adapter` so rooms span instances.
2. Sticky sessions at the load balancer.
3. Move message fan-out to Redis pub/sub or a queue for durability.
4. Add per-user connection limits and rate limits.
5. Track presence in Redis with TTL heartbeats.
6. Add an outbox table for reliable event emission after DB commits.

## 12. Debugging checklist

| Symptom | Check |
|---|---|
| Socket connects then disconnects | Token expired; auth callback returning empty |
| No `message:new` | Socket not in `conversation:<id>`; membership check failed |
| Duplicate messages | Dedupe by id missing; sender appended both HTTP and socket copies |
| Call event not received | Receiver socket not connected; event listener not registered globally |
| Relay ignored | Sender not in the conversation room, or client applying its own `from` |
| Works in chat, not on feed | Listener only mounted on chat route (see incoming-call gap) |

## 13. Improvement backlog

1. Re-join rooms on reconnect (P0 for reliability).
2. Global socket lifecycle tied to auth (P0 for calls).
3. Typing indicator client (P2).
4. Message pagination and newer-than-200 history (P2).
5. Delivery/read receipts (P3).
6. Push notifications for offline messages (P3).
7. Redis adapter (production only).
