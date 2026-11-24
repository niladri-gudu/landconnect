import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter, type Href } from 'expo-router';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ListingStatus } from '@landconnect/shared';

import { ListingCard } from '@/components/listing-card';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  ListingCardSkeleton,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing, type } from '@/lib/theme';

function statusTone(status: ListingStatus): 'green' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'green';
  if (status === 'SOLD') return 'warning';
  return 'neutral';
}

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

  if (!canSell) return <Redirect href={'/(tabs)' as Href} />;

  function confirmRemove(id: string, title: string) {
    Alert.alert(
      'Remove listing?',
      `“${title}” will be permanently removed from LandConnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => remove.mutate(id),
        },
      ],
    );
  }

  const items = mine.data?.items ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={mine.isRefetching}
            onRefresh={() => {
              void mine.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.heading}>My listings</Text>
                <Text style={styles.subheading}>
                  {items.length > 0
                    ? `${items.length} ${items.length === 1 ? 'plot' : 'plots'} published`
                    : 'Publish and manage the land you list.'}
                </Text>
              </View>
              <Button
                label="List land"
                icon="add"
                variant="tonal"
                size="small"
                fullWidth={false}
                onPress={() => router.push('/listing/create' as Href)}
              />
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.xl }} />}
        ListEmptyComponent={
          mine.isLoading ? (
            <View style={{ gap: spacing.lg }}>
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </View>
          ) : mine.isError ? (
            <ErrorState
              message={mine.error instanceof Error ? mine.error.message : undefined}
              onRetry={() => {
                void mine.refetch();
              }}
            />
          ) : (
            <EmptyState
              icon="business-outline"
              title="No listings yet"
              body="Publish your first plot with photos, price, size and an exact location."
              actionLabel="List your first plot"
              onAction={() => router.push('/listing/create' as Href)}
            />
          )
        }
        renderItem={({ item }) => (
          <View>
            <ListingCard listing={item} />
            <View style={styles.cardActions}>
              <Badge
                label={
                  item.status === 'ACTIVE'
                    ? 'Active'
                    : item.status === 'SOLD'
                      ? 'Sold'
                      : 'Archived'
                }
                tone={statusTone(item.status)}
              />
              <View style={styles.actionsRight}>
                <Pressable
                  onPress={() =>
                    router.push(`/listing/create?id=${item.id}` as Href)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.title}`}
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Ionicons name="create-outline" size={15} color={colors.primary} />
                  <Text style={styles.editText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmRemove(item.id, item.title)}
                  disabled={remove.isPending}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.title}`}
                  style={({ pressed }) => [
                    styles.removeButton,
                    pressed && { opacity: 0.7 },
                    remove.isPending && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: { flex: 1, gap: spacing.sm },
  heading: { ...type.display, color: colors.text },
  subheading: { ...type.body, color: colors.textMuted },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  editText: { ...type.label, color: colors.primary },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  removeText: { ...type.label, color: colors.danger },
});
