import { SOCKET_EVENTS } from '@landconnect/shared';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import { API_URL } from './config';
import { getAccessToken, refreshSession } from './session';

let socket: Socket | null = null;
const joinedConversations = new Set<string>();
let authRefreshInFlight = false;
let appStateBound = false;

function attachLifecycle(instance: Socket) {
  // Server rooms are in-memory, so every reconnect loses conversation
  // membership. Re-join from the registry before any message can arrive.
  instance.on('connect', () => {
    for (const conversationId of joinedConversations) {
      instance.emit(SOCKET_EVENTS.conversationJoin, conversationId);
    }
  });

  instance.on('connect_error', (error) => {
    const message = String(error?.message ?? '').toLowerCase();
    if (!message.includes('token') && !message.includes('auth')) return;
    if (authRefreshInFlight) return;

    authRefreshInFlight = true;
    void refreshSession()
      .catch(() => {
        // No session or no network — the reconnect loop keeps trying.
      })
      .finally(() => {
        // The auth callback runs again on the next attempt with the new token.
        setTimeout(() => {
          authRefreshInFlight = false;
        }, 5_000);
      });
  });

  if (appStateBound) return;
  appStateBound = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && socket && !socket.connected) {
      socket.connect();
    }
  });
}

/**
 * Connect (or reuse) the realtime socket. Auth is a callback so every
 * reconnection uses the latest access token, even after a refresh rotation.
 */
export function connectSocket(): Socket {
  if (socket) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  socket = io(API_URL, {
    // Polling first, then upgrade: websocket-only fails behind some proxies.
    transports: ['polling', 'websocket'],
    auth: (callback) => callback({ token: getAccessToken() ?? '' }),
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 10_000,
  });

  attachLifecycle(socket);
  return socket;
}

/** Join a conversation room and keep it joined across reconnects. */
export function joinConversation(conversationId: string) {
  joinedConversations.add(conversationId);
  const instance = connectSocket();
  if (instance.connected) {
    instance.emit(SOCKET_EVENTS.conversationJoin, conversationId);
  }
}

export function leaveConversation(conversationId: string) {
  joinedConversations.delete(conversationId);
  if (socket?.connected) {
    socket.emit(SOCKET_EVENTS.conversationLeave, conversationId);
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  joinedConversations.clear();
  socket?.disconnect();
  socket = null;
}
