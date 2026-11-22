import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { IncomingCallHost } from '@/components/incoming-call';
import { AuthProvider } from '@/lib/auth';
import { colors } from '@/lib/theme';

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
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.primary },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="listing/[id]" options={{ title: 'Listing' }} />
          <Stack.Screen
            name="listing/create"
            options={{ title: 'List your land', presentation: 'modal' }}
          />
          <Stack.Screen name="chat/[conversationId]" options={{ title: 'Chat' }} />
          <Stack.Screen name="call/[callId]" options={{ headerShown: false }} />
        </Stack>
        <IncomingCallHost />
      </AuthProvider>
    </QueryClientProvider>
  );
}
