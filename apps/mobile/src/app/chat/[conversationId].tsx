import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SOCKET_EVENTS,
  type CallKind,
  type ConversationDto,
  type MessageDto,
  type MessageReceiptDto,
} from '@landconnect/shared';

import { Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getSocket, joinConversation, leaveConversation } from '@/lib/socket';
import { colors, radius, spacing } from '@/lib/theme';

type ChatMessage = MessageDto & {
  pending?: boolean;
  failed?: boolean;
};

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

function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
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
  const time = formatTime(message.createdAt);

  if (message.pending) {
    return <Text style={styles.metaMuted}>{time} · Sending…</Text>;
  }
  if (message.failed) {
    return (
      <Pressable onPress={onRetry} accessibilityRole="button">
        <Text style={styles.metaFailed}>{time} · Tap to retry</Text>
      </Pressable>
    );
  }
  if (!mine) {
    return <Text style={styles.metaMuted}>{time}</Text>;
  }

  const read = Boolean(message.readAt);
  const delivered = Boolean(message.deliveredAt);
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaMuted}>{time}</Text>
      <Text style={[styles.tick, read ? styles.tickRead : styles.tickMuted]}>
        {delivered || read ? '✓✓' : '✓'}
      </Text>
    </View>
  );
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [startingCall, setStartingCall] = useState<CallKind | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const other = conversation.data?.participants.find((p) => p.id !== user?.id);
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

    socket.on(SOCKET_EVENTS.messageNew, onMessage);
    socket.on(SOCKET_EVENTS.messageDelivered, onDelivered);
    socket.on(SOCKET_EVENTS.messageRead, onRead);

    // Opening the chat marks existing unread messages as read.
    markConversationRead();

    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
      socket.off(SOCKET_EVENTS.messageNew, onMessage);
      socket.off(SOCKET_EVENTS.messageDelivered, onDelivered);
      socket.off(SOCKET_EVENTS.messageRead, onRead);
      leaveConversation(conversationId);
    };
  }, [accessToken, conversationId, queryClient, user?.id]);

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
    setStartingCall(kind);
    setError(null);
    try {
      const call = await api.calls.create({ conversationId, kind });
      router.push(`/call/${call.id}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start call');
    } finally {
      setStartingCall(null);
    }
  }

  if (history.isLoading && messages.length === 0) return <Loading />;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title,
          headerTitleStyle: { fontWeight: '700' },
          headerRight: () => (
            <View style={styles.callButtons}>
              <Pressable
                accessibilityLabel="Start audio call"
                onPress={() => startCall('AUDIO')}
                disabled={startingCall !== null}
              >
                <Text style={styles.callGlyph}>📞</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Start video call"
                onPress={() => startCall('VIDEO')}
                disabled={startingCall !== null}
              >
                <Text style={styles.callGlyph}>📹</Text>
              </Pressable>
            </View>
          ),
        }}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id || item.senderId === 'me';
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={styles.bubbleText}>{item.body}</Text>
              <MessageMeta message={item} mine={mine} onRetry={() => retry(item)} />
            </View>
          );
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View
        style={[
          styles.composer,
          { paddingBottom: Math.max(insets.bottom, spacing.sm) },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={send}
          disabled={!draft.trim()}
          accessibilityRole="button"
          style={[styles.send, !draft.trim() && { opacity: 0.5 }]}
        >
          <Text style={styles.sendText}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  callButtons: { flexDirection: 'row', gap: spacing.md, paddingRight: spacing.sm },
  callGlyph: { fontSize: 20 },
  list: { padding: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.bubbleOut },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.bubbleIn },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  metaMuted: {
    alignSelf: 'flex-end',
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
  },
  metaFailed: {
    alignSelf: 'flex-end',
    marginTop: 2,
    fontSize: 11,
    color: colors.danger,
    fontWeight: '600',
  },
  tick: { fontSize: 12, fontWeight: '700', letterSpacing: -1.5 },
  tickRead: { color: colors.tickRead },
  tickMuted: { color: colors.tickMuted },
  error: { color: colors.danger, paddingHorizontal: spacing.lg, fontSize: 13 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
    color: colors.text,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: colors.white, fontSize: 18, fontWeight: '800' },
});
