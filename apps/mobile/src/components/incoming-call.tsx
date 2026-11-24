import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import { ensureCallPermissions } from '@/lib/call-permissions';
import { roleLabel } from '@/lib/format';
import { connectSocket } from '@/lib/socket';
import { colors, radius, spacing, type } from '@/lib/theme';
import { Avatar } from './ui';

/**
 * App-level ring UI. Without this, the receiver only sees a call if they are
 * already on the call route — which never happens for an incoming call.
 */
export function IncomingCallHost() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [incoming, setIncoming] = useState<CallDto | null>(null);
  const [connecting, setConnecting] = useState(false);
  // Read the current route without re-subscribing the socket on every
  // navigation; otherwise each screen change re-fetches a pending call.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!accessToken || !user) return;
    const socket = connectSocket();

    const onIncoming = (call: CallDto) => {
      if (call.receiverId !== user.id || call.status !== 'RINGING') return;
      if (pathnameRef.current.startsWith('/call/')) return;
      setIncoming(call);
    };

    // A ring emitted while the socket was down is lost; ask the server for any
    // call still ringing whenever we reconnect or return to the foreground.
    const refreshPendingCall = () => {
      if (pathnameRef.current.startsWith('/call/')) return;
      void api.calls
        .incoming()
        .then((result) => {
          const call = result.call;
          if (!call || call.status !== 'RINGING') return;
          setIncoming((current) => (current?.id === call.id ? current : call));
        })
        .catch(() => undefined);
    };

    const clear = (call: CallDto) => {
      setIncoming((current) => (current?.id === call.id ? null : current));
    };

    socket.on(SOCKET_EVENTS.callIncoming, onIncoming);
    socket.on(SOCKET_EVENTS.callEnded, clear);
    socket.on(SOCKET_EVENTS.callRejected, clear);
    socket.on('connect', refreshPendingCall);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPendingCall();
    });
    refreshPendingCall();

    return () => {
      socket.off(SOCKET_EVENTS.callIncoming, onIncoming);
      socket.off(SOCKET_EVENTS.callEnded, clear);
      socket.off(SOCKET_EVENTS.callRejected, clear);
      socket.off('connect', refreshPendingCall);
      appState.remove();
    };
  }, [accessToken, user]);

  // Navigating into the call route always dismisses the ring overlay.
  useEffect(() => {
    if (pathname.startsWith('/call/')) setIncoming(null);
  }, [pathname]);

  useEffect(() => {
    if (incoming && !connecting) {
      Vibration.vibrate([0, 800, 800], true);
    } else {
      Vibration.cancel();
    }
    return () => Vibration.cancel();
  }, [incoming, connecting]);

  async function accept() {
    if (!incoming || connecting) return;
    const call = incoming;
    // Keep the ring card up with a spinner while the answer request and media
    // token are in flight; dismissing it first leaves a frozen-looking screen.
    setConnecting(true);

    try {
      // Asking after answering would join a room with a muted microphone and
      // no way to tell the caller why. Gate acceptance on the permission prompt.
      const allowed = await ensureCallPermissions(call.kind);
      if (!allowed) {
        Alert.alert(
          'Microphone access needed',
          'Allow microphone access (and camera access for video calls) in Settings to take this call.',
        );
        return;
      }

      const result = await api.calls.answer(call.id, true);
      // Hand the answered call and its LiveKit grant to the call screen so it
      // does not have to fetch the same data again.
      queryClient.setQueryData(['call', call.id], result.call);
      if (result.livekit) {
        queryClient.setQueryData(['call-media', call.id], result.livekit);
      }
      setIncoming(null);
      router.push(`/call/${call.id}` as Href);
    } catch (err) {
      Alert.alert(
        'Could not answer',
        err instanceof Error ? err.message : 'Try answering the call again.',
      );
    } finally {
      setConnecting(false);
    }
  }

  async function decline() {
    if (!incoming || connecting) return;
    const call = incoming;
    setIncoming(null);
    try {
      await api.calls.answer(call.id, false);
    } catch {
      // Call may already have been cancelled by the other side.
    }
  }

  if (!incoming) return null;

  const caller = incoming.initiator;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kind}>
            {incoming.kind === 'VIDEO' ? 'Incoming video call' : 'Incoming audio call'}
          </Text>

          <Avatar name={caller.name} uri={caller.avatarUrl} size={78} ring />
          <Text style={styles.name}>{caller.name}</Text>
          <Text style={styles.role}>{roleLabel(caller.role)} · LandConnect</Text>
          <View style={styles.lockRow}>
            <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.hint}>No phone numbers are exchanged</Text>
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Pressable
                style={[styles.circle, styles.decline, connecting && styles.disabled]}
                onPress={decline}
                disabled={connecting}
                accessibilityRole="button"
                accessibilityLabel="Decline call"
              >
                <Ionicons name="call" size={26} color={colors.white} style={styles.hangup} />
              </Pressable>
              <Text style={styles.actionLabel}>Decline</Text>
            </View>
            <View style={styles.action}>
              <Pressable
                style={[styles.circle, styles.accept, connecting && styles.disabled]}
                onPress={accept}
                disabled={connecting}
                accessibilityRole="button"
                accessibilityLabel={connecting ? 'Connecting call' : 'Accept call'}
                accessibilityState={{ busy: connecting }}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="call" size={26} color={colors.white} />
                )}
              </Pressable>
              <Text style={styles.actionLabel}>
                {connecting ? 'Connecting…' : 'Accept'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 14, 10, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  kind: {
    ...type.label,
    color: 'rgba(255,255,255,0.62)',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  name: { ...type.h2, color: colors.white, marginTop: spacing.sm },
  role: { ...type.caption, color: 'rgba(255,255,255,0.64)' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.xs },
  hint: { ...type.caption, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  actions: {
    flexDirection: 'row',
    gap: spacing.huge,
    marginTop: spacing.xxl,
  },
  action: { alignItems: 'center', gap: spacing.sm },
  circle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decline: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.primary },
  disabled: { opacity: 0.6 },
  hangup: { transform: [{ rotate: '135deg' }] },
  actionLabel: { ...type.caption, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
});
