import type { CallKind } from '@landconnect/shared';
import { PermissionsAndroid, Platform } from 'react-native';

type AndroidPermission =
  (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS];

/**
 * Ask for the runtime permissions WebRTC needs before a room is joined.
 *
 * Without this, Android silently joins the call with the microphone muted
 * (and no camera track for video) whenever the permission has not been
 * granted yet — the call looks connected but nobody can hear anything.
 * iOS is handled by the native WebRTC layer with the usage strings in app.json.
 */
export async function ensureCallPermissions(kind: CallKind): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  const permissions: AndroidPermission[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
  if (kind === 'VIDEO') permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return permissions.every(
    (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}
