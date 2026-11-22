import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SOCKET_EVENTS,
  type ConversationDto,
  type MessageDto,
} from '@landconnect/shared';

import { Avatar, EmptyState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { connectSocket } from '@/lib/socket';
import { colors, spacing } from '@/lib/theme';

function otherParticipants(conversation: ConversationDto, meId?: string) {
  return conversation.participants.filter((p) => p.id !== meId);
}

export default function MessagesScreen() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.conversations.list(),
  });

  // Keep previews and ordering live while the tab is open.
  useEffect(() => {
    if (!accessToken) return;
    const socket = connectSocket();

    const onMessage = (message: MessageDto) => {
      const cached = queryClient.getQueryData<ConversationDto[]>(['conversations']);
      if (cached && !cached.some((item) => item.id === message.conversationId)) {
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
        return;
      }

      queryClient.setQueryData<ConversationDto[]>(['conversations'], (prev) => {
        if (!prev) return prev;
        return prev
          .map((conversation) =>
            conversation.id === message.conversationId
              ? {
                  ...conversation,
                  lastMessage: {
                    id: message.id,
                    body: message.body,
                    senderId: message.senderId,
                    createdAt: message.createdAt,
                  },
                  lastMessageAt: message.createdAt,
                }
              : conversation,
          )
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      });
    };

    socket.on(SOCKET_EVENTS.messageNew, onMessage);
    return () => {
      socket.off(SOCKET_EVENTS.messageNew, onMessage);
    };
  }, [accessToken, queryClient]);

  if (conversations.isLoading) return <Loading />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={conversations.isRefetching}
            onRefresh={() => {
              void conversations.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No conversations"
            body="Open a listing and tap Message seller to start a private chat."
          />
        }
        renderItem={({ item }) => {
          const others = otherParticipants(item, user?.id);
          const title = others.map((p) => p.name).join(', ') || 'Conversation';
          return (
            <Pressable
              onPress={() => router.push(`/chat/${item.id}` as Href)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <Avatar name={title} uri={others[0]?.avatarUrl ?? undefined} />
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.listingTitle ? `Re: ${item.listingTitle}` : 'Direct message'}
                  {item.lastMessage ? ` · ${item.lastMessage.body}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  preview: { fontSize: 13, color: colors.textMuted },
});
