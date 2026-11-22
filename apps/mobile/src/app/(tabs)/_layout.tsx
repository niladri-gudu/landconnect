import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '@/lib/theme';

function Icon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused }) => <Icon glyph="🏘️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: 'My Listings',
          tabBarIcon: ({ focused }) => <Icon glyph="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <Icon glyph="💬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <Icon glyph="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
