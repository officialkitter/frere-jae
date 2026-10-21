import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { isBackendConfigured, supabase } from '@/lib/supabase';

const BIO_KEY = 'frerejae.biometric.enabled';

interface AuthState {
  session: Session | null;
  ready: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  locked: boolean;
  init: () => Promise<() => void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  unlock: () => Promise<boolean>;
  setBiometric: (on: boolean) => Promise<boolean>;
}

async function promptBiometric(reason: string) {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // allow device PIN as fallback
  });
  return res.success;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  ready: false,
  biometricEnabled: false,
  biometricAvailable: false,
  locked: false,

  init: async () => {
    const hasHw = await LocalAuthentication.hasHardwareAsync().catch(() => false);
    const enrolled = await LocalAuthentication.isEnrolledAsync().catch(() => false);
    const available = hasHw && enrolled;
    const enabled = available && (await SecureStore.getItemAsync(BIO_KEY)) === '1';

    const { data } = isBackendConfigured
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    set({
      session: data.session,
      biometricAvailable: available,
      biometricEnabled: enabled,
      locked: !!data.session && enabled, // require unlock on cold start
      ready: true,
    });

    if (!isBackendConfigured) return () => {};
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => set({ session }));
    return () => sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return error.message;
    set({ locked: false });
    return null;
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    return error ? error.message : null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIO_KEY);
    set({ session: null, locked: false, biometricEnabled: false });
  },

  unlock: async () => {
    const ok = await promptBiometric('Unlock Frère Jae');
    if (ok) set({ locked: false });
    return ok;
  },

  setBiometric: async (on) => {
    if (!get().biometricAvailable) return false;
    if (on && !(await promptBiometric('Confirm to enable biometric unlock'))) return false;
    if (on) await SecureStore.setItemAsync(BIO_KEY, '1');
    else await SecureStore.deleteItemAsync(BIO_KEY);
    set({ biometricEnabled: on });
    return true;
  },
}));
