import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={23}
      color={typeof color === 'string' ? color : colors.textFaint}
    />
  );
}

export default function TabsLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const canSell = user?.role === 'SELLER' || user?.role === 'BROKER';

  // Same query key as the Messages tab: the banner host updates this cache,
  // so the badge follows every incoming message without polling.
  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.conversations.list(),
    enabled: Boolean(user),
  });
  const unread = conversations.data?.reduce((sum, item) => sum + item.unreadCount, 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingTop: 7,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: tabIcon('compass', 'compass-outline'),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          // Buyers never see seller tooling. The route also redirects, so a
          // deep link cannot expose it.
          href: canSell ? undefined : null,
          tabBarIcon: tabIcon('business', 'business-outline'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.white,
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}
