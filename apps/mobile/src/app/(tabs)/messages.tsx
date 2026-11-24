import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ConversationDto } from '@landconnect/shared';

import {
  Avatar,
  EmptyState,
  ErrorState,
  SkeletonBlock,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatConversationTime } from '@/lib/format';
import { colors, spacing, type } from '@/lib/theme';

function otherParticipants(conversation: ConversationDto, meId?: string) {
  return conversation.participants.filter((participant) => participant.id !== meId);
}

function ConversationSkeleton() {
  return (
    <View style={styles.skeletonRow}>
      <SkeletonBlock height={52} width={52} radius={26} />
      <View style={styles.skeletonCopy}>
        <SkeletonBlock height={14} width="42%" />
        <SkeletonBlock height={12} width="76%" />
      </View>
    </View>
  );
}

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.conversations.list(),
  });

  const unreadTotal =
    conversations.data?.reduce((sum, conversation) => sum + conversation.unreadCount, 0) ?? 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={conversations.data ?? []}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={conversations.isRefetching}
            onRefresh={() => {
              void conversations.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Messages</Text>
            <Text style={styles.subheading}>
              {unreadTotal > 0
                ? `${unreadTotal} unread message${unreadTotal === 1 ? '' : 's'}`
                : 'Private chats with owners and brokers.'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          conversations.isLoading ? (
            <View>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </View>
          ) : conversations.isError ? (
            <ErrorState
              message={
                conversations.error instanceof Error ? conversations.error.message : undefined
              }
              onRetry={() => {
                void conversations.refetch();
              }}
            />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              body="Open a plot and tap Message seller. Your phone number stays private."
              actionLabel="Browse land"
              onAction={() => router.push('/(tabs)' as Href)}
            />
          )
        }
        renderItem={({ item }) => {
          const others = otherParticipants(item, user?.id);
          const title = others.map((participant) => participant.name).join(', ') || 'Conversation';
          const unread = item.unreadCount ?? 0;
          const preview = item.lastMessage
            ? `${item.lastMessage.senderId === user?.id ? 'You: ' : ''}${item.lastMessage.body}`
            : item.listingTitle
              ? `Re: ${item.listingTitle}`
              : 'Start the conversation';

          return (
            <Pressable
              onPress={() => {
                queryClient.setQueryData<ConversationDto[]>(
                  ['conversations'],
                  (prev) =>
                    prev?.map((conversation) =>
                      conversation.id === item.id
                        ? { ...conversation, unreadCount: 0 }
                        : conversation,
                    ),
                );
                router.push(`/chat/${item.id}` as Href);
              }}
              android_ripple={{ color: colors.surfaceAlt }}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <Avatar
                name={title}
                uri={others[0]?.avatarUrl ?? undefined}
                size={52}
              />
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text
                    numberOfLines={1}
                    style={[styles.name, unread > 0 && styles.nameUnread]}
                  >
                    {title}
                  </Text>
                  <Text style={styles.time}>{formatConversationTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  {item.listingTitle ? (
                    <Ionicons name="home-outline" size={12} color={colors.textFaint} />
                  ) : null}
                  <Text
                    numberOfLines={1}
                    style={[styles.preview, unread > 0 && styles.previewUnread]}
                  >
                    {preview}
                  </Text>
                  {unread > 0 ? (
                    <View style={styles.unread}>
                      <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xxxl },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  heading: { ...type.display, color: colors.text },
  subheading: { ...type.body, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  rowPressed: { backgroundColor: colors.surfaceAlt },
  rowBody: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.title, flex: 1, color: colors.text },
  nameUnread: { fontWeight: '700' },
  time: { ...type.caption, fontSize: 12, color: colors.textFaint },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  preview: { ...type.caption, flex: 1, color: colors.textMuted },
  previewUnread: { color: colors.text, fontWeight: '600' },
  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.xl + 52 + spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  skeletonCopy: { flex: 1, gap: spacing.sm },
});
