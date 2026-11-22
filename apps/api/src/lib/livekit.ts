import { AccessToken } from 'livekit-server-sdk';

import { env, livekitEnabled } from '../env';

export interface LivekitGrant {
  url: string;
  room: string;
  token: string;
}

/**
 * Returns a room-join token when LIVEKIT_* env vars are configured.
 * When they are not, the client falls back to Socket.IO peer-to-peer signalling.
 */
export async function createLivekitGrant(
  identity: string,
  name: string,
  room: string,
): Promise<LivekitGrant | null> {
  if (!livekitEnabled) return null;

  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    name,
    ttl: '2h',
  });
  at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true });

  return { url: env.livekit.url, room, token: await at.toJwt() };
}
