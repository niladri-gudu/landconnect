import { LiveKitRoom } from '@livekit/react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { colors, spacing } from '@/lib/theme';

type LivekitSession = NonNullable<CallAnswerDto['livekit']>;

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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.kind}>{kindLabel}</Text>
        <Text style={styles.status}>
          {ringing
            ? isInitiator
              ? 'Calling…'
              : 'Incoming call'
            : active
              ? media
                ? 'Connected'
                : 'Connecting media…'
              : status?.toLowerCase() ?? ''}
        </Text>
      </View>

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
          <View style={styles.stage}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{isInitiator ? 'R' : 'C'}</Text>
            </View>
            <Text style={styles.hint}>
              {active
                ? 'Connecting audio/video…'
                : 'No phone numbers are exchanged'}
            </Text>
          </View>

          {ringing && !isInitiator ? (
            <View style={styles.ringActions}>
              <Pressable
                style={[styles.circle, styles.reject]}
                onPress={() => answer(false)}
                disabled={busy}
                accessibilityLabel="Reject call"
              >
                <Text style={styles.circleGlyph}>✕</Text>
              </Pressable>
              <Pressable
                style={[styles.circle, styles.accept]}
                onPress={() => answer(true)}
                disabled={busy}
                accessibilityLabel="Accept call"
              >
                <Text style={styles.circleGlyph}>✓</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.activeControls}>
              <Pressable
                style={[styles.circle, styles.reject]}
                onPress={endCall}
                disabled={busy}
                accessibilityLabel={active ? 'End call' : 'Cancel call'}
              >
                <Text style={styles.circleGlyph}>{active ? '⏹' : '✕'}</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primaryDark, padding: spacing.xl },
  header: { alignItems: 'center', gap: 6, paddingTop: spacing.xl },
  kind: { color: colors.white, fontSize: 24, fontWeight: '800' },
  status: { color: '#B8D8D2', fontSize: 15 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  room: { flex: 1, width: '100%' },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 48, fontWeight: '800' },
  hint: { color: '#B8D8D2', fontSize: 13, textAlign: 'center', maxWidth: 280 },
  error: { color: '#FFB4AB', textAlign: 'center', marginTop: spacing.md },
  ringActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  activeControls: { alignItems: 'center', gap: spacing.xl, paddingBottom: spacing.xl },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reject: { backgroundColor: colors.danger },
  accept: { backgroundColor: colors.accent },
  circleGlyph: { color: colors.white, fontSize: 28, fontWeight: '800' },
});
