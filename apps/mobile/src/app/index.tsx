import { Redirect, type Href } from 'expo-router';

import { Loading } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { loading, user } = useAuth();

  if (loading) return <Loading />;

  return <Redirect href={(user ? '/(tabs)' : '/(auth)/login') as Href} />;
}
