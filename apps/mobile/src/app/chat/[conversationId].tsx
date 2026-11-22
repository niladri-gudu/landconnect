import { useQuery } from '@tanstack/react-query';
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

import { SOCKET_EVENTS, type CallKind, type MessageDto } from '@landconnect/shared';

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
      existing ? { ...existing, ...message, pending: false, failed: false } : message,
    );
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [startingCall, setStartingCall] = useState<CallKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const history = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => api.conversations.messages(conversationId),
    enabled: Boolean(conversationId),
  });

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

    const onMessage = (message: MessageDto) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => mergeMessages(prev, [message]));
    };

    socket.on(SOCKET_EVENTS.messageNew, onMessage);

    return () => {
      socket.off(SOCKET_EVENTS.messageNew, onMessage);
      leaveConversation(conversationId);
    };
  }, [accessToken, conversationId]);

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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: 'Chat',
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
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id || item.senderId === 'me';
          return (
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={styles.bubbleText}>{item.body}</Text>
              {mine && (item.pending || item.failed) ? (
                <Pressable
                  onPress={() => item.failed && retry(item)}
                  disabled={!item.failed}
                  accessibilityRole={item.failed ? 'button' : undefined}
                >
                  <Text
                    style={[styles.messageState, item.failed && styles.messageFailed]}
                  >
                    {item.failed ? 'Tap to retry' : 'Sending…'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.composer}>
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
  list: { padding: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.bubbleOut },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.bubbleIn },
  bubbleText: { fontSize: 15, color: colors.text, lineHeight: 20 },
  messageState: {
    marginTop: 2,
    alignSelf: 'flex-end',
    fontSize: 11,
    color: colors.textMuted,
  },
  messageFailed: { color: colors.danger, fontWeight: '600' },
  error: { color: colors.danger, paddingHorizontal: spacing.lg, fontSize: 13 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm,
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
