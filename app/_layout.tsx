import { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { Loading } from '@/components/ui';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Gate({ children }: { children: React.ReactNode }) {
  const { session, ready, locked } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === '(auth)';
    const inLock = segments[0] === 'lock';
    if (session && locked && !inLock) router.replace('/lock');
    else if (session && !locked && (inAuth || inLock)) router.replace('/(tabs)' as Href);
  }, [ready, session, locked, segments, router]);

  if (!ready) return <Loading />;
  return <>{children}</>;
}

export default function RootLayout() {
  const init = useAuth((s) => s.init);
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then((c) => { cleanup = c; });
    return () => cleanup?.();
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Gate>
        <Stack screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.tanzanite,
          headerTitleStyle: { color: colors.tanzanite, fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="lock" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="product/[slug]" options={{ title: '' }} />
          <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
          <Stack.Screen name="payment" options={{ title: 'Payment' }} />
          <Stack.Screen name="account/[section]" options={{ title: 'Account' }} />
          <Stack.Screen name="order/[id]" options={{ title: 'Order Tracking' }} />
        </Stack>
      </Gate>
    </QueryClientProvider>
  );
}
