import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { Button, EmptyState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/lib/theme';

export default function MyListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canSell = user?.role === 'SELLER' || user?.role === 'BROKER';

  const mine = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api.listings.mine(),
    enabled: canSell,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.listings.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      void queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });

  if (!canSell) {
    return (
      <View style={styles.screen}>
        <EmptyState
          title="Buyers browse, sellers list"
          body="Your account is a Buyer account. Register as a Seller or Broker to publish land listings."
        />
      </View>
    );
  }

  if (mine.isLoading) return <Loading />;

  return (
    <View style={styles.screen}>
      <FlatList
        data={mine.data?.items ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Button
              label="+ List new land"
              onPress={() => router.push('/listing/create' as Href)}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No listings yet"
            body="Publish your first plot — add photos, price, size and an exact location."
          />
        }
        renderItem={({ item }) => (
          <View style={{ gap: spacing.sm }}>
            <ListingCard listing={item} />
            <Pressable
              onPress={() => remove.mutate(item.id)}
              accessibilityRole="button"
              style={styles.remove}
            >
              <Text style={styles.removeText}>Remove listing</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  remove: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#FDECEA',
  },
  removeText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
});
