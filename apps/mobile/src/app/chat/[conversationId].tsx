import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SOCKET_EVENTS,
  type CallKind,
  type ConversationDto,
  type MessageDto,
  type MessageReceiptDto,
} from '@landconnect/shared';

import { StartingCall } from '@/components/starting-call';
import { Avatar, IconButton, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ensureCallPermissions } from '@/lib/call-permissions';
import { formatDayLabel, formatTime, roleLabel } from '@/lib/format';
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { colors, radius, spacing, type } from '@/lib/theme';

type ChatMessage = MessageDto & {
  pending?: boolean;
  failed?: boolean;
};

type ChatRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: ChatMessage };

function mergeMessages(current: ChatMessage[], incoming: MessageDto[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of current) byId.set(message.id, message);
  for (const message of incoming) {
    const existing = byId.get(message.id);
    byId.set(
      message.id,
      existing
        ? {
            ...existing,
            ...message,
            // A late REST/history response must not erase a receipt that
            // already arrived over the socket.
            deliveredAt: message.deliveredAt ?? existing.deliveredAt ?? null,
            readAt: message.readAt ?? existing.readAt ?? null,
            pending: false,
            failed: false,
          }
        : message,
    );
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function MessageMeta({
  message,
  mine,
  onRetry,
}: {
  message: ChatMessage;
  mine: boolean;
  onRetry: () => void;
}) {
  if (message.pending) {
    return (
      <View style={styles.metaRow}>
        <ActivityIndicator size={10} color={colors.textMuted} />
        <Text style={styles.metaText}>Sending…</Text>
      </View>
    );
  }

  if (message.failed) {
    return (
      <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={6}>
        <View style={styles.metaRow}>
          <Ionicons name="alert-circle" size={12} color={colors.danger} />
          <Text style={[styles.metaText, { color: colors.danger, fontWeight: '700' }]}>
            Tap to retry
          </Text>
        </View>
      </Pressable>
    );
  }

  if (!mine) {
    return <Text style={[styles.metaText, styles.metaAlone]}>{formatTime(message.createdAt)}</Text>;
  }

  const read = Boolean(message.readAt);
  const delivered = Boolean(message.deliveredAt) || read;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaText}>{formatTime(message.createdAt)}</Text>
      <Ionicons
        name={delivered ? 'checkmark-done' : 'checkmark'}
        size={14}
        color={read ? colors.tickRead : colors.tickMuted}
      />
    </View>
  );
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatRow>>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [startingCall, setStartingCall] = useState<CallKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Cancelling mid-flight must not leave a ringing call on the server.
  const cancelCallRef = useRef(false);

  const conversation = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api.conversations.get(conversationId),
    enabled: Boolean(conversationId),
  });

  const history = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.conversations.messages(conversationId),
    enabled: Boolean(conversationId),
  });

  const other = conversation.data?.participants.find((participant) => participant.id !== user?.id);
  const title = other?.name ?? 'Chat';

  // Merge, never replace: a refetch must not wipe a socket-delivered or
  // pending message that arrived while the request was in flight.
  useEffect(() => {
    if (history.data) {
      setMessages((prev) => mergeMessages(prev, history.data));
    }
  }, [history.data]);

  useEffect(() => {
    if (!accessToken || !conversationId) return;

    joinConversation(conversationId);
    const socket = getSocket();
    if (!socket) return;

    const markConversationRead = () => {
      socket.emit(SOCKET_EVENTS.conversationRead, conversationId);
      queryClient.setQueryData<ConversationDto[]>(['conversations'], (prev) =>
        prev?.map((item) =>
          item.id === conversationId ? { ...item, unreadCount: 0 } : item,
        ),
      );
      queryClient.setQueryData<ConversationDto>(
        ['conversation', conversationId],
        (prev) => (prev ? { ...prev, unreadCount: 0 } : prev),
      );
    };

    const onMessage = (message: MessageDto) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => mergeMessages(prev, [message]));

      if (message.senderId !== user?.id) {
        socket.emit(SOCKET_EVENTS.messageDelivered, {
          conversationId,
          messageIds: [message.id],
        });
        if (readTimer.current) clearTimeout(readTimer.current);
        readTimer.current = setTimeout(markConversationRead, 250);
      }
    };

    const onDelivered = (receipt: MessageReceiptDto) => {
      if (receipt.conversationId !== conversationId) return;
      const ids = new Set(receipt.messageIds);
      setMessages((prev) =>
        prev.map((message) =>
          ids.has(message.id)
            ? { ...message, deliveredAt: message.deliveredAt ?? receipt.at }
            : message,
        ),
      );
    };

    const onRead = (receipt: MessageReceiptDto) => {
      if (receipt.conversationId !== conversationId) return;
      const ids = new Set(receipt.messageIds);
      setMessages((prev) =>
        prev.map((message) =>
          ids.has(message.id)
            ? {
                ...message,
                deliveredAt: message.deliveredAt ?? receipt.at,
                readAt: receipt.at,
              }
            : message,
        ),
      );
    };

    // Anything sent while the socket was down is not replayed by the server;
    // refresh history (and the list previews) on reconnect and foreground.
    const refreshHistory = () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on(SOCKET_EVENTS.messageNew, onMessage);
    socket.on(SOCKET_EVENTS.messageDelivered, onDelivered);
    socket.on(SOCKET_EVENTS.messageRead, onRead);
    socket.on('connect', refreshHistory);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshHistory();
    });

    // Opening the chat marks existing unread messages as read.
    markConversationRead();

    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
      socket.off(SOCKET_EVENTS.messageNew, onMessage);
      socket.off(SOCKET_EVENTS.messageDelivered, onDelivered);
      socket.off(SOCKET_EVENTS.messageRead, onRead);
      socket.off('connect', refreshHistory);
      appState.remove();
      leaveConversation(conversationId);
    };
  }, [accessToken, conversationId, queryClient, user?.id]);

  const rows = useMemo(() => {
    const next: ChatRow[] = [];
    let lastDay = '';
    for (const message of messages) {
      const day = new Date(message.createdAt).toDateString();
      if (day !== lastDay) {
        next.push({
          kind: 'day',
          key: `day-${day}`,
          label: formatDayLabel(message.createdAt),
        });
        lastDay = day;
      }
      next.push({ kind: 'message', key: message.id, message });
    }
    return next;
  }, [messages]);

  async function deliver(body: string, clientId: string) {
    if (!conversationId) return;
    try {
      const sent = await api.conversations.send(conversationId, body);
      setMessages((prev) =>
        mergeMessages(
          prev.filter((item) => item.id !== clientId),
          [sent],
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message failed');
      setMessages((prev) =>
        prev.map((item) =>
          item.id === clientId ? { ...item, pending: false, failed: true } : item,
        ),
      );
    }
  }

  function send() {
    const body = draft.trim();
    if (!body || !conversationId) return;

    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: ChatMessage = {
      id: clientId,
      conversationId,
      senderId: user?.id ?? 'me',
      body,
      type: 'TEXT',
      createdAt: new Date().toISOString(),
      deliveredAt: null,
      readAt: null,
      pending: true,
    };

    setDraft('');
    setError(null);
    setMessages((prev) => [...prev, optimistic]);
    void deliver(body, clientId);
  }

  function retry(message: ChatMessage) {
    setError(null);
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id ? { ...item, pending: true, failed: false } : item,
      ),
    );
    void deliver(message.body, message.id);
  }

  async function startCall(kind: CallKind) {
    if (!conversationId) return;
    cancelCallRef.current = false;
    setStartingCall(kind);
    setError(null);

    let opened = false;
    try {
      const allowed = await ensureCallPermissions(kind);
      if (!allowed) {
        if (!cancelCallRef.current) {
          setError(
            kind === 'VIDEO'
              ? 'Microphone and camera access are required for video calls. Allow them in Settings, then try again.'
              : 'Microphone access is required for calls. Allow it in Settings, then try again.',
          );
        }
        return;
      }
      if (cancelCallRef.current) return;

      const call = await api.calls.create({ conversationId, kind });
      // Hand the call to the route through the query cache so it renders the
      // ringing stage immediately with no second loading state.
      queryClient.setQueryData(['call', call.id], call);

      if (cancelCallRef.current) {
        void api.calls.end(call.id).catch(() => undefined);
        return;
      }

      opened = true;
      router.push(`/call/${call.id}` as Href);
      // Dismiss the setup overlay now that the call screen is being pushed.
      setStartingCall(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start call');
    } finally {
      if (!opened) setStartingCall(null);
    }
  }

  function cancelStartingCall() {
    cancelCallRef.current = true;
    setStartingCall(null);
  }

  if (history.isLoading && messages.length === 0) return <Loading />;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />

      <View style={styles.header}>
        <IconButton
          name="chevron-back"
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          variant="plain"
          size={44}
        />
        <Avatar name={title} uri={other?.avatarUrl} size={38} />
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.headerName}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.headerMeta}>
            {other ? roleLabel(other.role) : 'LandConnect chat'}
          </Text>
        </View>
        <IconButton
          name="call-outline"
          onPress={() => startCall('AUDIO')}
          accessibilityLabel="Start audio call"
          variant="plain"
          size={44}
          disabled={startingCall !== null}
        />
        <IconButton
          name="videocam-outline"
          onPress={() => startCall('VIDEO')}
          accessibilityLabel="Start video call"
          variant="plain"
          size={44}
          disabled={startingCall !== null}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            if (item.kind === 'day') {
              return (
                <View style={styles.dayRow}>
                  <Text style={styles.dayLabel}>{item.label}</Text>
                </View>
              );
            }

            const message = item.message;

            // Call outcomes are system entries, not chat bubbles.
            if (message.type === 'CALL') {
              const video = message.body.toLowerCase().includes('video');
              return (
                <View style={styles.callLogRow}>
                  <View style={styles.callLogPill}>
                    <Ionicons
                      name={video ? 'videocam-outline' : 'call-outline'}
                      size={13}
                      color={colors.primary}
                    />
                    <Text style={styles.callLogText}>{message.body}</Text>
                    <Text style={styles.callLogTime}>{formatTime(message.createdAt)}</Text>
                  </View>
                </View>
              );
            }

            const mine = message.senderId === user?.id || message.senderId === 'me';
            return (
              <View style={styles.bubbleRow}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{message.body}</Text>
                  <MessageMeta
                    message={message}
                    mine={mine}
                    onRetry={() => retry(message)}
                  />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
              </View>
              <Text style={styles.emptyChatTitle}>Say hello</Text>
              <Text style={styles.emptyChatBody}>
                Messages stay inside LandConnect. Your phone number is never shared.
              </Text>
            </View>
          }
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.inputShell}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              style={styles.input}
              multiline
            />
          </View>
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !draft.trim() }}
            style={({ pressed }) => [
              styles.send,
              !draft.trim() && styles.sendDisabled,
              pressed && draft.trim() ? { opacity: 0.85 } : null,
            ]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <StartingCall
        visible={startingCall !== null}
        kind={startingCall ?? 'AUDIO'}
        name={title}
        role={other ? roleLabel(other.role) : ''}
        avatarUrl={other?.avatarUrl ?? null}
        onCancel={cancelStartingCall}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.chatBackground },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCopy: { flex: 1, gap: 1, marginLeft: spacing.sm },
  headerName: { ...type.title, fontSize: 16 },
  headerMeta: { ...type.caption, fontSize: 12, color: colors.textMuted },
  list: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 6, flexGrow: 1 },
  callLogRow: { alignItems: 'center', paddingVertical: 2 },
  callLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  callLogText: { ...type.caption, fontSize: 12, color: colors.primary, fontWeight: '600' },
  callLogTime: { ...type.micro, color: colors.textMuted },
  dayRow: { alignItems: 'center', paddingVertical: spacing.sm },
  dayLabel: {
    ...type.micro,
    color: colors.textMuted,
    textTransform: 'uppercase',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  bubbleRow: { width: '100%' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    paddingBottom: 5,
    borderRadius: radius.lg,
    gap: 2,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.bubbleOut,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bubbleIn,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { ...type.body, fontSize: 15, lineHeight: 21, color: colors.text },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
  },
  metaText: { fontSize: 10.5, lineHeight: 14, color: colors.textMuted },
  metaAlone: { alignSelf: 'flex-end' },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.huge,
  },
  emptyChatIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatTitle: { ...type.h2, fontSize: 18 },
  emptyChatBody: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 270,
    lineHeight: 19,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...type.caption, fontSize: 12, color: colors.danger, flex: 1 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inputShell: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  input: {
    ...type.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    maxHeight: 100,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
