import { Ionicons } from '@expo/vector-icons';
import { LiveKitRoom } from '@livekit/react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  SOCKET_EVENTS,
  type CallAnswerDto,
  type CallDto,
  type CallStatus,
} from '@landconnect/shared';

import { ActiveCall } from '@/components/active-call';
import { Avatar, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { roleLabel } from '@/lib/format';
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { colors, radius, spacing, type } from '@/lib/theme';

type LivekitSession = NonNullable<CallAnswerDto['livekit']>;

function Control({
  icon,
  label,
  tone,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: 'accept' | 'decline' | 'neutral';
  onPress: () => void;
  disabled?: boolean;
}) {
  const background =
    tone === 'accept'
      ? colors.primary
      : tone === 'decline'
        ? colors.danger
        : 'rgba(255,255,255,0.14)';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: background },
        pressed && { opacity: 0.82 },
        disabled && { opacity: 0.5 },
      ]}
    >
      <Ionicons name={icon} size={26} color={colors.white} />
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
}

export default function CallScreen() {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<CallStatus | null>(null);
  const [media, setMedia] = useState<LivekitSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useQuery({
    queryKey: ['call', callId],
    queryFn: () => api.calls.get(callId),
    enabled: Boolean(callId),
  });

  useEffect(() => {
    if (call.data) setStatus(call.data.status);
  }, [call.data]);

  const conversationId: string | undefined = call.data?.conversationId;
  const isInitiator = call.data?.initiatorId === user?.id;

  const conversation = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.conversations.get(conversationId as string),
    enabled: Boolean(conversationId),
  });
  const other = conversation.data?.participants.find((participant) => participant.id !== user?.id);
  const title = other?.name ?? 'LandConnect member';

  // The callee receives credentials in the answer response; the caller (and
  // any screen opened after acceptance) fetches its own room token.
  useEffect(() => {
    if (status !== 'ACTIVE' || media || !callId) return;
    let cancelled = false;

    void (async () => {
      try {
        const credentials = await api.calls.token(callId);
        if (!cancelled) setMedia(credentials);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Media is unavailable');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, media, callId]);

  useEffect(() => {
    if (!accessToken || !conversationId) return;

    joinConversation(conversationId);
    const socket = getSocket();
    if (!socket) return;

    const onAccepted = () => setStatus('ACTIVE');
    const onRejected = () => {
      setStatus('REJECTED');
      router.back();
    };
    const onEnded = () => {
      setStatus('ENDED');
      router.back();
    };

    socket.on(SOCKET_EVENTS.callAccepted, onAccepted);
    socket.on(SOCKET_EVENTS.callRejected, onRejected);
    socket.on(SOCKET_EVENTS.callEnded, onEnded);

    return () => {
      socket.off(SOCKET_EVENTS.callAccepted, onAccepted);
      socket.off(SOCKET_EVENTS.callRejected, onRejected);
      socket.off(SOCKET_EVENTS.callEnded, onEnded);
      leaveConversation(conversationId);
    };
  }, [accessToken, conversationId, router]);

  async function answer(accept: boolean) {
    setBusy(true);
    setError(null);
    try {
      const result = await api.calls.answer(callId, accept);
      if (!accept) {
        router.back();
        return;
      }
      setStatus('ACTIVE');
      setMedia(result.livekit ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not answer call');
    } finally {
      setBusy(false);
    }
  }

  async function endCall() {
    setBusy(true);
    try {
      await api.calls.end(callId);
      router.back();
    } catch {
      router.back();
    } finally {
      setBusy(false);
    }
  }

  if (call.isLoading || !call.data) return <Loading />;

  const data: CallDto = call.data;
  const ringing = status === 'RINGING';
  const active = status === 'ACTIVE';
  const kindLabel = data.kind === 'VIDEO' ? 'Video call' : 'Audio call';
  const statusLabel = ringing
    ? isInitiator
      ? 'Calling…'
      : 'Incoming call'
    : active
      ? media
        ? 'Connected'
        : 'Connecting media…'
      : status?.toLowerCase() ?? '';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      {active && media ? (
        <View style={styles.room}>
          <LiveKitRoom
            serverUrl={media.url}
            token={media.token}
            connect
            audio
            video={data.kind === 'VIDEO'}
            onError={(roomError) => setError(roomError.message)}
            onDisconnected={() => setStatus('ENDED')}
          >
            <ActiveCall kind={data.kind} onEnd={endCall} busy={busy} />
          </LiveKitRoom>
        </View>
      ) : (
        <>
          <View style={styles.top}>
            <Text style={styles.kind}>{kindLabel}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{statusLabel}</Text>
            </View>
          </View>

          <View style={styles.stage}>
            <Avatar name={title} uri={other?.avatarUrl} size={104} ring />
            <Text style={styles.name}>{title}</Text>
            <Text style={styles.role}>
              {other ? `${roleLabel(other.role)} · ` : ''}LandConnect
            </Text>
            <View style={styles.lockRow}>
              <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.hint}>No phone numbers are exchanged</Text>
            </View>
          </View>

          {ringing && !isInitiator ? (
            <View style={styles.controls}>
              <Control
                icon="close"
                label="Decline"
                tone="decline"
                onPress={() => answer(false)}
                disabled={busy}
              />
              <Control
                icon="call"
                label="Accept"
                tone="accept"
                onPress={() => answer(true)}
                disabled={busy}
              />
            </View>
          ) : (
            <View style={styles.controls}>
              <Control
                icon="call"
                label={active ? 'End call' : 'Cancel'}
                tone="decline"
                onPress={endCall}
                disabled={busy}
              />
            </View>
          )}
        </>
      )}

      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={16} color="#FFB4AB" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDark, padding: spacing.xl },
  room: { flex: 1 },
  top: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  kind: { ...type.label, color: 'rgba(255,255,255,0.66)', textTransform: 'uppercase' },
  statusPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statusText: { ...type.caption, fontSize: 12, color: colors.white },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  name: { ...type.h1, color: colors.white, marginTop: spacing.md },
  role: { ...type.caption, color: 'rgba(255,255,255,0.66)' },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.lg,
  },
  hint: { ...type.caption, fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.huge,
    paddingBottom: spacing.xl,
  },
  control: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  controlLabel: { color: colors.white, fontSize: 10, fontWeight: '600' },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,180,171,0.12)',
  },
  errorText: { ...type.caption, fontSize: 12, color: '#FFB4AB', flex: 1 },
});
