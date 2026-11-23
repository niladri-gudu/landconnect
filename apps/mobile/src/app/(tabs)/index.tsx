import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListingCard } from '@/components/listing-card';
import {
  Avatar,
  EmptyState,
  ErrorState,
  ListingCardSkeleton,
} from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/hooks';
import { colors, radius, spacing, type } from '@/lib/theme';

export default function CommunityScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const listings = useQuery({
    queryKey: ['listings', debouncedSearch],
    queryFn: () =>
      api.listings.list({
        q: debouncedSearch.trim() || undefined,
        pageSize: 25,
      }),
    placeholderData: (previous) => previous,
  });

  const items = listings.data?.items ?? [];
  const total = listings.data?.total ?? 0;
  const isSearching = debouncedSearch.trim().length > 0;
  const showSkeletons = listings.isLoading && !listings.data;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ListingCard listing={item} featured={index === 0} />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={listings.isRefetching && !showSkeletons}
            onRefresh={() => {
              void listings.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.topBar}>
              <View style={styles.brand}>
                <Image
                  source={require('../../../assets/images/brand-mark.png')}
                  style={styles.brandMark}
                  accessibilityIgnoresInvertColors
                />
                <Text style={styles.brandName}>LandConnect</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/profile' as Href)}
                accessibilityRole="button"
                accessibilityLabel="Open your profile"
                hitSlop={8}
              >
                <Avatar name={user?.name ?? 'You'} uri={user?.avatarUrl} size={38} />
              </Pressable>
            </View>

            <Text style={styles.heading}>Find your ground</Text>
            <Text style={styles.subheading}>
              Land from owners and brokers, with every conversation kept private.
            </Text>

            <View style={styles.searchShell}>
              <Ionicons name="search-outline" size={19} color={colors.textMuted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search city, title or keyword"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch('')}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={19} color={colors.textFaint} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>
                {listings.data
                  ? `${total} ${total === 1 ? 'plot' : 'plots'}`
                  : 'Plots across India'}
              </Text>
              {items.length > 0 ? <Text style={styles.sortLabel}>Newest first</Text> : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          showSkeletons ? (
            <View style={{ gap: spacing.lg }}>
              <ListingCardSkeleton />
              <ListingCardSkeleton />
              <ListingCardSkeleton />
            </View>
          ) : listings.isError ? (
            <ErrorState
              message={
                listings.error instanceof Error ? listings.error.message : undefined
              }
              onRetry={() => {
                void listings.refetch();
              }}
            />
          ) : isSearching ? (
            <EmptyState
              icon="search-outline"
              title="No land matches"
              body={`Nothing found for “${debouncedSearch.trim()}”. Try a city or a shorter keyword.`}
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          ) : (
            <EmptyState
              icon="leaf-outline"
              title="No plots yet"
              body="Sellers and brokers can publish the first listing from the My Listings tab."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: { paddingTop: spacing.sm, paddingBottom: spacing.xl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandMark: { width: 32, height: 32 },
  brandName: { ...type.title, fontSize: 16, color: colors.text },
  heading: { ...type.display, color: colors.text },
  subheading: {
    ...type.body,
    color: colors.textMuted,
    maxWidth: 330,
    marginTop: spacing.sm,
  },
  searchShell: {
    marginTop: spacing.xl,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  searchInput: {
    ...type.body,
    flex: 1,
    color: colors.text,
    paddingVertical: 0,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  resultCount: { ...type.caption, fontWeight: '600', color: colors.textMuted },
  sortLabel: { ...type.caption, fontSize: 12, color: colors.textFaint },
});
