import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SOCKET_EVENTS,
  type ConversationDto,
  type MessageDto,
} from '@landconnect/shared';

import { useAuth } from '@/lib/auth';
import { connectSocket } from '@/lib/socket';
import { colors, radius, spacing, type } from '@/lib/theme';
import { Avatar } from './ui';

interface BannerState {
  conversationId: string;
  title: string;
  body: string;
  avatarUrl: string | null;
}

/**
 * App-level in-app notification. The prototype has no push service, so while
 * the app is open this banner (plus the Messages tab badge) is what tells a
 * user a message arrived. It also owns the live conversation-list updates so
 * unread counts stay correct on every screen, not just the Messages tab.
 */
export function MessageBannerHost() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerState | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    if (!accessToken || !user) return;
    const socket = connectSocket();

    const show = (next: BannerState) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setBanner(next);
      hideTimer.current = setTimeout(() => setBanner(null), 4_500);
    };

    const onMessage = (message: MessageDto) => {
      const mine = message.senderId === user.id;
      const cached = queryClient.getQueryData<ConversationDto[]>(['conversations']);
      const known = cached?.some((item) => item.id === message.conversationId) ?? false;

      if (cached && known) {
        queryClient.setQueryData<ConversationDto[]>(['conversations'], (prev) =>
          prev
            ?.map((conversation) =>
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
                    unreadCount: mine
                      ? conversation.unreadCount
                      : conversation.unreadCount + 1,
                  }
                : conversation,
            )
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
        );
      } else {
        // A conversation we have never listed yet: fetch the authoritative row.
        void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }

      if (mine) return;
      if (AppState.currentState !== 'active') return;
      if (pathnameRef.current === `/chat/${message.conversationId}`) return;
      if (pathnameRef.current.startsWith('/call/')) return;

      const conversation = cached?.find((item) => item.id === message.conversationId);
      const other = conversation?.participants.find((participant) => participant.id !== user.id);

      show({
        conversationId: message.conversationId,
        title: other?.name ?? conversation?.listingTitle ?? 'New message',
        body: message.body,
        avatarUrl: other?.avatarUrl ?? null,
      });
    };

    // Catch up on anything sent while the socket was down or backgrounded.
    const refreshConversations = () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on(SOCKET_EVENTS.messageNew, onMessage);
    socket.on('connect', refreshConversations);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshConversations();
    });

    return () => {
      socket.off(SOCKET_EVENTS.messageNew, onMessage);
      socket.off('connect', refreshConversations);
      appState.remove();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [accessToken, user, queryClient]);

  // The banner is pointless once its conversation is on screen.
  useEffect(() => {
    pathnameRef.current = pathname;
    if (banner && pathname === `/chat/${banner.conversationId}`) {
      setBanner(null);
    }
  }, [pathname, banner]);

  if (!banner) return null;

  function open() {
    if (!banner) return;
    queryClient.setQueryData<ConversationDto[]>(['conversations'], (prev) =>
      prev?.map((conversation) =>
        conversation.id === banner.conversationId
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
    setBanner(null);
    router.push(`/chat/${banner.conversationId}` as Href);
  }

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: Math.max(insets.top, spacing.sm) }]}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`New message from ${banner.title}`}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }]}
      >
        <Avatar name={banner.title} uri={banner.avatarUrl} size={38} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    elevation: 6,
    shadowColor: '#10201C',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  copy: { flex: 1, gap: 2 },
  title: { ...type.title, fontSize: 15 },
  body: { ...type.caption, color: colors.textMuted },
});
