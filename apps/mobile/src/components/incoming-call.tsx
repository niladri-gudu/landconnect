import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

import { SOCKET_EVENTS, type CallDto } from '@landconnect/shared';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
  const [incoming, setIncoming] = useState<CallDto | null>(null);

  const conversation = useQuery({
    queryKey: ['conversation', incoming?.conversationId],
    queryFn: () => api.conversations.get(incoming?.conversationId as string),
    enabled: Boolean(incoming?.conversationId),
  });
  const other = conversation.data?.participants.find(
    (participant) => participant.id !== user?.id,
  );

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

  const name = other?.name ?? 'LandConnect member';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={decline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kind}>
            {incoming.kind === 'VIDEO' ? 'Incoming video call' : 'Incoming audio call'}
          </Text>

          <Avatar name={name} uri={other?.avatarUrl} size={78} ring />
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>{other ? `${roleLabel(other.role)} · ` : ''}LandConnect</Text>
          <View style={styles.lockRow}>
            <Ionicons name="lock-closed-outline" size={13} color="rgba(255,255,255,0.6)" />
            <Text style={styles.hint}>No phone numbers are exchanged</Text>
          </View>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Pressable
                style={[styles.circle, styles.decline]}
                onPress={decline}
                accessibilityRole="button"
                accessibilityLabel="Decline call"
              >
                <Ionicons name="close" size={28} color={colors.white} />
              </Pressable>
              <Text style={styles.actionLabel}>Decline</Text>
            </View>
            <View style={styles.action}>
              <Pressable
                style={[styles.circle, styles.accept]}
                onPress={accept}
                accessibilityRole="button"
                accessibilityLabel="Accept call"
              >
                <Ionicons name="call" size={26} color={colors.white} />
              </Pressable>
              <Text style={styles.actionLabel}>Accept</Text>
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
  actionLabel: { ...type.caption, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
});
