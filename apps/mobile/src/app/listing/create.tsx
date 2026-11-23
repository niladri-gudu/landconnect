import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

import { ListingImage } from '@/components/listing-image';
import { LocationPicker } from '@/components/listing-map';
import { Button, Card, Field, SectionHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { colors, radius, spacing, type } from '@/lib/theme';

export default function CreateListingScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [areaAcres, setAreaAcres] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
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

  async function pickPhotos() {
    setError(null);
    const remaining = 4 - photos.length;
    if (remaining <= 0) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo permission was denied — allow it in system settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.8,
      });
      if (!result.canceled) {
        setPhotos((current) => [...current, ...result.assets].slice(0, 4));
      }
    } catch {
      setError('Could not open the photo library.');
    }
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
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
      images: [] as string[],
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
      const imageUrls =
        photos.length > 0
          ? (
              await api.uploads.images(
                photos.map((photo, index) => ({
                  uri: photo.uri,
                  name: photo.fileName ?? `photo-${index + 1}.jpg`,
                  type: photo.mimeType ?? 'image/jpeg',
                })),
              )
            ).urls
          : [];
      const listing = await api.listings.create({ ...parsed.data, images: imageUrls });
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
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.heading}>Publish your land</Text>
          <Text style={styles.subheading}>
            Add the facts buyers care about. You can edit or remove the listing later.
          </Text>
        </View>

        <View style={styles.section}>
          <SectionHeader title="The basics" />
          <Card style={styles.card}>
            <Field
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="5-acre farm land near the highway"
              hint="At least 5 characters."
            />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Soil, water, access road, documents, nearby landmarks…"
              hint="At least 20 characters. Mention what makes this plot useful."
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Price and size" />
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field
                  label="Price (₹)"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="25,00,000"
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
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Location" />
          <Card style={styles.card}>
            <Field
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Village, taluk, landmark"
              icon="location-outline"
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Field label="City" value={city} onChangeText={setCity} placeholder="Bengaluru" />
              </View>
              <View style={styles.flex}>
                <Field label="State" value={state} onChangeText={setState} placeholder="Karnataka" />
              </View>
            </View>
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
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
            />
            <Button
              label={locating ? 'Reading GPS…' : 'Use my current location'}
              icon="locate-outline"
              variant="tonal"
              size="small"
              fullWidth={false}
              onPress={useMyLocation}
              loading={locating}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Photos" />
          <Card style={styles.card}>
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <View key={photo.assetId ?? photo.uri} style={styles.photoTile}>
                  <ListingImage
                    uri={photo.uri}
                    title={title || 'Listing photo'}
                    style={styles.photo}
                  />
                  <Pressable
                    onPress={() => removePhoto(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove photo ${index + 1}`}
                    hitSlop={8}
                    style={styles.removePhoto}
                  >
                    <Ionicons name="close" size={14} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 4 ? (
                <Pressable
                  onPress={pickPhotos}
                  accessibilityRole="button"
                  accessibilityLabel="Add photos"
                  android_ripple={{ color: colors.primarySoft }}
                  style={styles.addPhoto}
                >
                  <Ionicons name="add" size={24} color={colors.primary} />
                  <Text style={styles.addPhotoText}>Add photo</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.photoHintText}>
              {photos.length}/4 selected · JPEG, PNG or WebP, up to 8 MB each. Photos upload when
              you publish.
            </Text>
          </Card>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button
          label="Publish listing"
          icon="checkmark-circle-outline"
          onPress={submit}
          loading={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.huge, gap: spacing.xxl },
  intro: { gap: spacing.sm, paddingTop: spacing.sm },
  heading: { ...type.h1 },
  subheading: { ...type.body, color: colors.textMuted, maxWidth: 330 },
  section: { gap: spacing.md },
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoTile: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  photo: { width: '100%', height: '100%' },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(12, 22, 16, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  addPhotoText: { ...type.micro, color: colors.primary },
  photoHintText: { ...type.caption, fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...type.caption, color: colors.danger, flex: 1 },
});
