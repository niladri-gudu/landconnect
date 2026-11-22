import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';

import { SOCKET_EVENTS, type CallDto } from '@landconnect/shared';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { connectSocket } from '@/lib/socket';
import { colors, radius, spacing } from '@/lib/theme';

/**
 * App-level ring UI. Without this, the receiver only sees a call if they are
 * already on the call route — which never happens for an incoming call.
 */
export function IncomingCallHost() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<CallDto | null>(null);

  useEffect(() => {
    if (!accessToken || !user) return;
    const socket = connectSocket();

    const onIncoming = (call: CallDto) => {
      if (call.receiverId !== user.id || call.status !== 'RINGING') return;
      if (pathname.startsWith('/call/')) return;
      setIncoming(call);
    };

    const clear = (call: CallDto) => {
      setIncoming((current) => (current?.id === call.id ? null : current));
    };

    socket.on(SOCKET_EVENTS.callIncoming, onIncoming);
    socket.on(SOCKET_EVENTS.callEnded, clear);
    socket.on(SOCKET_EVENTS.callRejected, clear);

    return () => {
      socket.off(SOCKET_EVENTS.callIncoming, onIncoming);
      socket.off(SOCKET_EVENTS.callEnded, clear);
      socket.off(SOCKET_EVENTS.callRejected, clear);
    };
  }, [accessToken, user, pathname]);

  // Navigating into the call route always dismisses the ring overlay.
  useEffect(() => {
    if (pathname.startsWith('/call/')) setIncoming(null);
  }, [pathname]);

  useEffect(() => {
    if (incoming) {
      Vibration.vibrate([0, 800, 800], true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [incoming]);

  async function accept() {
    if (!incoming) return;
    const call = incoming;
    setIncoming(null);
    try {
      await api.calls.answer(call.id, true);
    } catch {
      // The call screen re-reads authoritative state and shows any error.
    }
    router.push(`/call/${call.id}` as Href);
  }

  async function decline() {
    if (!incoming) return;
    const call = incoming;
    setIncoming(null);
    try {
      await api.calls.answer(call.id, false);
    } catch {
      // Call may already have been cancelled by the other side.
    }
  }

  if (!incoming) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kind}>
            {incoming.kind === 'VIDEO' ? 'Incoming video call' : 'Incoming audio call'}
          </Text>
          <Text style={styles.hint}>No phone numbers are exchanged</Text>

          <View style={styles.actions}>
            <Pressable
              style={[styles.circle, styles.decline]}
              onPress={decline}
              accessibilityLabel="Decline call"
            >
              <Text style={styles.glyph}>✕</Text>
            </Pressable>
            <Pressable
              style={[styles.circle, styles.accept]}
              onPress={accept}
              accessibilityLabel="Accept call"
            >
              <Text style={styles.glyph}>✓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  kind: { color: colors.white, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  hint: { color: '#B8D8D2', fontSize: 13, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: spacing.xxl,
    marginTop: spacing.xl,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.accent },
  glyph: { color: colors.white, fontSize: 28, fontWeight: '800' },
});
