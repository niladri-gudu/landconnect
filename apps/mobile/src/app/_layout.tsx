import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { IncomingCallHost } from '@/components/incoming-call';
import { AuthProvider } from '@/lib/auth';
import { colors, type } from '@/lib/theme';

// WebRTC globals must exist before any LiveKit room is created. Kept off web,
// where the native WebRTC module is unavailable.
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@livekit/react-native').registerGlobals();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000 },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { ...type.title, fontSize: 17 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listing/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="listing/create"
            options={{
              title: 'List your land',
              presentation: 'modal',
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen name="chat/[conversationId]" options={{ headerShown: false }} />
          <Stack.Screen name="call/[callId]" options={{ headerShown: false }} />
        </Stack>
        <IncomingCallHost />
      </AuthProvider>
    </QueryClientProvider>
  );
}
