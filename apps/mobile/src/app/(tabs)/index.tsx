import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ListingCard } from '@/components/listing-card';
import { EmptyState, Loading } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';

export default function CommunityScreen() {
  const [search, setSearch] = useState('');
  const listings = useQuery({
    queryKey: ['listings', search],
    queryFn: () =>
      api.listings.list({ q: search.trim() || undefined, pageSize: 25 }),
  });

  if (listings.isLoading) return <Loading />;

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by city, title or keyword"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={listings.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListingCard listing={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        refreshControl={
          <RefreshControl
            refreshing={listings.isRefetching}
            onRefresh={() => {
              void listings.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No land listings yet"
            body="Sellers and brokers can publish the first listing from the My Listings tab."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchWrap: { padding: spacing.lg, backgroundColor: colors.primary },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
});
