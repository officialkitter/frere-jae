import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Body, Button, Field, Heading, Screen } from '@/components/ui';
import { isBackendConfigured } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { colors, spacing } from '@/theme';

export default function Login() {
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) { setError('Enter your email and password.'); return; }
    if (!isBackendConfigured) { setError('Sign-in is unavailable in this preview. You can continue shopping as a guest.'); return; }
    setBusy(true); setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: colors.gold, letterSpacing: 4, fontSize: 12, fontWeight: '700' }}>FRÈRE</Text>
            <Heading>Jae</Heading>
            <Body muted style={{ marginTop: spacing.sm }}>Sign in to your fragrance atelier.</Body>
          </View>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none"
            keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry
            autoComplete="password" textContentType="password" />
          {error && <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text>}
          <Button title="SIGN IN" onPress={submit} loading={busy} />
          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <Link href="/(auth)/register" style={{ color: colors.tanzanite, fontWeight: '600' }}>
              New here? Create an account
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
