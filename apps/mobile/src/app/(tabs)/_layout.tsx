import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
