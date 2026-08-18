import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const key = 'mirage.api.url';
const fallback = process.env.EXPO_PUBLIC_MIRAGE_API_URL || 'http://mirage.local:8080';

export async function loadBaseUrl() {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) || fallback;
  return (await SecureStore.getItemAsync(key)) || fallback;
}
export async function saveBaseUrl(value: string) {
  if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}
