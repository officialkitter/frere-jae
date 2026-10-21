import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isBackendConfigured = Boolean(url && anonKey);

// SecureStore (Keychain / Keystore) holds the JWT session. Values >2KB are chunked.
const CHUNK = 1800;
const NativeSecureStorage = {
  async getItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (!count) return SecureStore.getItemAsync(key);
    const parts: string[] = [];
    for (let i = 0; i < Number(count); i++) {
      parts.push((await SecureStore.getItemAsync(`${key}.${i}`)) ?? '');
    }
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    if (value.length <= CHUNK) {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.deleteItemAsync(`${key}.n`);
      return;
    }
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(`${key}.n`, String(n));
  },
  async removeItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (count) {
      for (let i = 0; i < Number(count); i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
      await SecureStore.deleteItemAsync(`${key}.n`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

const SessionStorage = Platform.OS === 'web' ? {
  async getItem(key: string) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
} : NativeSecureStorage;

export const supabase = createClient(url ?? 'https://demo.invalid', anonKey ?? 'demo-anon-key', {
  auth: {
    storage: SessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh tokens while the app is foregrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
