import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Empty, ErrorState, Heading, Loading, Screen, StatusBadge } from '@/components/ui';
import { useOrders } from '@/hooks/data';
import { useAuth } from '@/store/auth';
import { useDemoStore } from '@/store/demo';
import { formatDate, formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export default function Orders() {
  const router = useRouter();
  const userId = useAuth((s) => s.session?.user.id);
  const orders = useOrders(userId);
  const demoOrders = useDemoStore((state) => state.orders);

  if (orders.isLoading) return <Loading />;
  if (orders.isError) return <ErrorState message="Could not load your orders." onRetry={() => orders.refetch()} />;

  return (
    <Screen>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
        <Heading>Orders</Heading>
        <Text style={s.intro}>{userId ? 'Every detail, from confirmation to your door.' : 'Guest orders stay available for this session.'}</Text>
      </View>
      {!orders.data?.length ? <Empty text="No orders yet. Your next signature scent is waiting." /> : (
        <FlatList
          data={orders.data}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: spacing.md }}
          refreshing={orders.isRefetching}
          onRefresh={() => orders.refetch()}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => router.push(`/order/${item.id}`)} accessibilityRole="button">
              <View style={s.cardRow}>
                <Image source={demoOrders.find((detail) => detail.order.id === item.id)?.items[0]?.image_url ?? undefined} style={s.thumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.num}>{item.order_number}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={s.sub}>{formatDate(item.created_at)}</Text>
                  <Text style={s.total}>{formatMoney(item.total_cents, item.currency)}</Text>
                  {item.tracking_ref && <Text style={s.tracking}>TRACKING  ·  {item.tracking_ref}</Text>}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 13, marginTop: 5 },
  card: { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, backgroundColor: colors.background },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 82, height: 100, borderRadius: radius.sm, backgroundColor: colors.surface },
  num: { color: colors.tanzanite, fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  sub: { color: colors.textMuted, marginTop: 6, fontSize: 12 },
  total: { color: colors.tanzanite, fontWeight: '700', marginTop: spacing.sm, fontSize: 16 },
  tracking: { color: colors.goldPressed, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
});
