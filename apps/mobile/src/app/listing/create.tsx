import * as Location from 'expo-location';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { listingCreateSchema } from '@landconnect/shared';

import { Button, Field } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, radius, spacing } from '@/lib/theme';

export default function CreateListingScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [areaAcres, setAreaAcres] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [images, setImages] = useState('');
  const [latitude, setLatitude] = useState('12.9716');
  const [longitude, setLongitude] = useState('77.5946');
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function useMyLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Location permission was denied — enter coordinates manually.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
    } catch {
      setError('Could not read your location.');
    } finally {
      setLocating(false);
    }
  }

  function toNumber(value: string): number {
    // Sellers often type "25,00,000" — strip separators before parsing.
    return Number(value.replace(/,/g, '').trim());
  }

  async function submit() {
    setBusy(true);
    setError(null);

    const payload = {
      title: title.trim(),
      description: description.trim(),
      price: toNumber(price),
      areaAcres: toNumber(areaAcres),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      country: 'India',
      latitude: toNumber(latitude),
      longitude: toNumber(longitude),
      images: images
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    };

    // Validate locally first so the error names the exact field and rule.
    const parsed = listingCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const fieldName = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      setError(`${fieldName}${issue.message}`);
      setBusy(false);
      return;
    }

    try {
      const listing = await api.listings.create(parsed.data);
      router.replace(`/listing/${listing.id}` as Href);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish listing');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Title" value={title} onChangeText={setTitle} placeholder="5-acre farm land near highway" />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Soil, access road, water, documents, nearby landmarks…"
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field
              label="Price (₹)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholder="2500000"
            />
          </View>
          <View style={styles.flex}>
            <Field
              label="Area (acres)"
              value={areaAcres}
              onChangeText={setAreaAcres}
              keyboardType="numeric"
              placeholder="5"
            />
          </View>
        </View>
        <Field label="Address" value={address} onChangeText={setAddress} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={styles.flex}>
            <Field label="State" value={state} onChangeText={setState} />
          </View>
        </View>

        <View style={styles.locationBox}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Field
                label="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.flex}>
              <Field
                label="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
            </View>
          </View>
          <Pressable onPress={useMyLocation} style={styles.locate} accessibilityRole="button">
            <Text style={styles.locateText}>
              {locating ? 'Reading GPS…' : '📍 Use my current location'}
            </Text>
          </Pressable>
        </View>

        <Field
          label="Image URLs (comma separated)"
          value={images}
          onChangeText={setImages}
          placeholder="https://…, https://…"
          autoCapitalize="none"
        />
        <Text style={styles.hint}>
          Paste full https image URLs (comma separated). Title needs 5+ characters,
          description 20+, price and area must be numbers.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Publish listing" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  locationBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  locate: { paddingVertical: 6 },
  locateText: { color: colors.teal, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 14 },
});
