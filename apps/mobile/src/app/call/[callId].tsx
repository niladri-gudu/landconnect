import { Ionicons } from '@expo/vector-icons';
import { LiveKitRoom } from '@livekit/react-native';
import { useQuery } from '@tanstack/react-query';
import * as Device from 'expo-device';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { ensureCallPermissions } from '@/lib/call-permissions';
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
  showLabel = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: 'accept' | 'decline' | 'neutral';
  onPress: () => void;
  disabled?: boolean;
  showLabel?: boolean;
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
      <Ionicons
        name={icon}
        size={26}
        color={colors.white}
        style={tone === 'decline' ? styles.hangup : undefined}
      />
      {showLabel ? <Text style={styles.controlLabel}>{label}</Text> : null}
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
  const [permission, setPermission] = useState<'checking' | 'granted' | 'denied'>(
    'checking',
  );

  // Ending from the UI and receiving the server's call:ended echo can race.
  // Leave the screen at most once, and never issue an unhandled GO_BACK.
  const closingRef = useRef(false);
  const closeCallScreen = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [router]);

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
  const other = call.data
    ? call.data.initiator.id === user?.id
      ? call.data.receiver
      : call.data.initiator
    : null;
  const title = other?.name ?? 'LandConnect member';
  const role = other ? roleLabel(other.role) : '';

  // Ask before joining: Android otherwise joins with a muted microphone and
  // no camera track, which looks like a broken call to both participants.
  useEffect(() => {
    if (!call.data) return;
    let cancelled = false;

    void ensureCallPermissions(call.data.kind).then((granted) => {
      if (cancelled) return;
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setError(
          'Microphone access is required to hear and be heard. Allow it in Settings, then try again.',
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [call.data]);

  async function retryPermissions() {
    if (!call.data) return;
    const granted = await ensureCallPermissions(call.data.kind);
    setPermission(granted ? 'granted' : 'denied');
    if (granted) setError(null);
  }

  // The callee's answer response seeds this cache before navigation; the
  // caller fetches once after call:accepted. Either way the room renders
  // without a second wait.
  const mediaQuery = useQuery({
    queryKey: ['call-media', callId],
    queryFn: () => api.calls.token(callId),
    enabled: status === 'ACTIVE' && permission === 'granted' && !media,
    staleTime: Infinity,
    retry: false,
  });
  const livekit = media ?? mediaQuery.data ?? null;

  useEffect(() => {
    if (mediaQuery.error) {
      setError(
        mediaQuery.error instanceof Error
          ? mediaQuery.error.message
          : 'Media is unavailable',
      );
    }
  }, [mediaQuery.error]);

  // Abandon a call that is never answered, so the receiver's ring cannot stay
  // stuck after the caller gives up. The server records it as ended.
  useEffect(() => {
    if (status !== 'RINGING' || !isInitiator || !callId) return;

    const timer = setTimeout(() => {
      void api.calls.end(callId).catch(() => undefined);
      setStatus('ENDED');
      setError('No answer');
      setTimeout(closeCallScreen, 1_200);
    }, 45_000);

    return () => clearTimeout(timer);
  }, [status, isInitiator, callId, closeCallScreen]);

  useEffect(() => {
    if (!accessToken || !conversationId) return;

    joinConversation(conversationId);
    const socket = getSocket();
    if (!socket) return;

    const onAccepted = () => setStatus('ACTIVE');
    const onRejected = () => {
      setStatus('REJECTED');
      closeCallScreen();
    };
    const onEnded = () => {
      setStatus('ENDED');
      closeCallScreen();
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
  }, [accessToken, conversationId, closeCallScreen]);

  async function answer(accept: boolean) {
    if (accept) {
      const granted = await ensureCallPermissions(call.data?.kind ?? 'AUDIO');
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setError(
          'Microphone access is required to take this call. Allow it in Settings, then try again.',
        );
        return;
      }
    }

    setBusy(true);
    setError(null);
    try {
      const result = await api.calls.answer(callId, accept);
      if (!accept) {
        closeCallScreen();
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
      closeCallScreen();
    } catch {
      closeCallScreen();
    } finally {
      setBusy(false);
    }
  }

  if (call.isLoading || !call.data) return <Loading />;

  const data: CallDto = call.data;
  const ringing = status === 'RINGING';
  const active = status === 'ACTIVE';
  const kindLabel = data.kind === 'VIDEO' ? 'Video call' : 'Audio call';
  // The emulator renders and encodes the virtual camera in software; capturing
  // at 720p/30 there is what makes the demo look laggy. Real phones keep the
  // SDK defaults.
  const videoCapture =
    data.kind === 'VIDEO'
      ? Device.isDevice
        ? true
        : { resolution: { width: 640, height: 480, frameRate: 24 } }
      : false;

  const statusLabel = ringing
    ? isInitiator
      ? 'Calling…'
      : 'Incoming call'
    : active
      ? livekit
        ? 'Connected'
        : permission === 'denied'
          ? 'Permission required'
          : 'Connecting media…'
      : status?.toLowerCase() ?? '';

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      {active && livekit ? (
        <View style={styles.room}>
          <LiveKitRoom
            serverUrl={livekit.url}
            token={livekit.token}
            connect
            audio
            video={videoCapture}
            options={{ adaptiveStream: true, dynacast: true }}
            onError={(roomError) => setError(roomError.message)}
            onDisconnected={() => setStatus('ENDED')}
          >
            <ActiveCall
              kind={data.kind}
              title={title}
              role={role}
              avatarUrl={other?.avatarUrl ?? null}
              onEnd={endCall}
              busy={busy}
            />
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
            <Text style={styles.role}>{role ? `${role} · ` : ''}LandConnect</Text>
            <View style={styles.lockRow}>
              <Ionicons name="lock-closed-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.hint}>No phone numbers are exchanged</Text>
            </View>
          </View>

          {ringing && !isInitiator ? (
            <View style={styles.controls}>
              <Control
                icon="call"
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
                showLabel={active}
              />
            </View>
          )}
        </>
      )}

      {error ? (
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={16} color="#FFB4AB" />
          <Text style={styles.errorText}>{error}</Text>
          {permission === 'denied' ? (
            <View style={styles.permissionActions}>
              <Pressable
                onPress={() => void retryPermissions()}
                accessibilityRole="button"
                accessibilityLabel="Try microphone permission again"
                style={styles.permissionButton}
              >
                <Text style={styles.permissionText}>Try again</Text>
              </Pressable>
              <Pressable
                onPress={() => void Linking.openSettings()}
                accessibilityRole="button"
                accessibilityLabel="Open system settings"
                style={styles.permissionButton}
              >
                <Text style={styles.permissionText}>Settings</Text>
              </Pressable>
            </View>
          ) : null}
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
  hangup: { transform: [{ rotate: '135deg' }] },
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
  permissionActions: { flexDirection: 'row', gap: spacing.sm },
  permissionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,180,171,0.18)',
  },
  permissionText: { ...type.caption, fontSize: 12, color: '#FFB4AB', fontWeight: '600' },
});
