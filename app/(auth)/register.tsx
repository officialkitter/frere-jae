import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Link } from 'expo-router';
import { Body, Button, Field, Heading, Screen } from '@/components/ui';
import { isBackendConfigured } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { colors, spacing } from '@/theme';

export default function Register() {
  const signUp = useAuth((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!name.trim() || !email || password.length < 10) {
      setError('Enter your name, email, and a password of at least 10 characters.');
      return;
    }
    if (!isBackendConfigured) { setError('Account creation is unavailable in this preview. You can continue shopping as a guest.'); return; }
    setBusy(true); setError(null);
    const err = await signUp(email, password, name);
    setBusy(false);
    if (err) setError(err); else setDone(true);
  }

  if (done) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1, justifyContent: 'center' }}>
          <Heading>Check your inbox</Heading>
          <Body muted style={{ marginVertical: spacing.md }}>
            We sent a confirmation link to {email}. Confirm your email, then sign in.
          </Body>
          <Link href="/(auth)/login" style={{ color: colors.tanzanite, fontWeight: '600' }}>Back to sign in</Link>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Heading>Create account</Heading>
          <Body muted style={{ marginVertical: spacing.md }}>Join to save your cart and track every order.</Body>
          <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" />
          <Field label="Password (min 10 characters)" value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
          {error && <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text>}
          <Button title="CREATE ACCOUNT" onPress={submit} loading={busy} />
          <Link href="/(auth)/login" style={{ color: colors.tanzanite, fontWeight: '600', marginTop: spacing.lg, textAlign: 'center' }}>
            Already have an account? Sign in
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
