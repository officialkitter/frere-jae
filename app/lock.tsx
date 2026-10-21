import { useCallback, useEffect } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Heading, Screen } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { colors, spacing } from '@/theme';

export default function Lock() {
  const unlock = useAuth((s) => s.unlock);
  const signOut = useAuth((s) => s.signOut);

  const attempt = useCallback(() => { void unlock(); }, [unlock]);
  useEffect(() => { attempt(); }, [attempt]);

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
        <Text style={{ color: colors.gold, letterSpacing: 4, fontSize: 12, fontWeight: '700' }}>FRÈRE JAE</Text>
        <Heading>Welcome back</Heading>
        <Body muted style={{ marginVertical: spacing.md }}>Unlock with biometrics to continue.</Body>
        <Button title="UNLOCK" onPress={attempt} />
        <Button title="Sign out" variant="outline" onPress={() => signOut()} style={{ marginTop: spacing.md }} />
      </View>
    </Screen>
  );
}
