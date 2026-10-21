import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ErrorState, Loading, StatusBadge } from '@/components/ui';
import { useOrderDetail } from '@/hooks/data';
import { formatDate, formatMoney } from '@/lib/format';
import { colors, orderStatusStyle, radius, spacing, type OrderStatus } from '@/theme';

const FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'in_transit', 'delivered'];

export default function OrderTracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError, refetch } = useOrderDetail(id);

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorState message="We couldn't load this order." onRetry={() => refetch()} />;

  const { order, items, events } = data;
  const paymentLabels = { mobile: 'Mobile money', cash: 'Cash on delivery', card: 'Bank card' };
  const paymentLabel = 'paymentMethod' in data
    ? `Payment preview · ${paymentLabels[data.paymentMethod]} (demo)`
    : 'Connect a payment provider to enable live charges.';
  const reached = new Map(events.map((e) => [e.status, e]));
  const cancelled = order.status === 'cancelled';
  const currentIdx = FLOW.indexOf(order.status);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
      <View style={s.header}>
        <View>
          <Text style={s.num}>{order.order_number}</Text>
          <Text style={s.sub}>Placed {formatDate(order.created_at)}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <Text style={s.section}>LIVE TRACKING</Text>
      {cancelled ? (
        <View style={[s.cancelBox]}><Text style={{ color: colors.danger, fontWeight: '700' }}>This order was cancelled.</Text></View>
      ) : (
        <View>
          {FLOW.map((st, i) => {
            const done = i <= currentIdx;
            const style = orderStatusStyle[st];
            const dotColor = done ? style.bg : colors.border;
            const ev = reached.get(st);
            return (
              <View key={st} style={s.step}>
                <View style={{ alignItems: 'center', width: 28 }}>
                  <View style={[s.dot, { backgroundColor: dotColor, borderColor: dotColor }, i === currentIdx && s.dotCurrent]} />
                  {i < FLOW.length - 1 && <View style={[s.line, { backgroundColor: i < currentIdx ? colors.success : colors.border }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: spacing.lg }}>
                  <Text style={[s.stepTitle, !done && { color: colors.textMuted }]}>{style.label}</Text>
                  {ev && <Text style={s.sub}>{formatDate(ev.created_at)}</Text>}
                  {st === 'in_transit' && order.tracking_ref && done && (
                    <Text style={s.sub}>Tracking ref: {order.tracking_ref}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={s.section}>ITEMS</Text>
      <View style={s.box}>
        {items.map((it) => (
          <View key={it.id} style={s.itemRow}>
            {'image_url' in it && it.image_url && <Image source={it.image_url} style={s.itemImage} contentFit="cover" />}
            <Text style={{ color: colors.tanzanite, flex: 1, marginLeft: spacing.sm }}>{it.quantity} × {it.product_name} ({it.size_ml} ml)</Text>
            <Text style={{ color: colors.tanzanite, fontWeight: '600' }}>{formatMoney(it.unit_price_cents * it.quantity, order.currency)}</Text>
          </View>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
        <View style={s.itemRow}><Text style={{ color: colors.textMuted }}>Delivery</Text><Text style={{ color: colors.tanzanite }}>{order.shipping_cents ? formatMoney(order.shipping_cents, order.currency) : 'Complimentary'}</Text></View>
        <View style={s.itemRow}><Text style={{ color: colors.tanzanite, fontWeight: '800' }}>Total</Text><Text style={{ color: colors.tanzanite, fontWeight: '800' }}>{formatMoney(order.total_cents, order.currency)}</Text></View>
      </View>
      {(order.ship_line1 || order.ship_city) && <>
        <Text style={s.section}>DELIVERING TO</Text>
        <View style={s.destination}>
          <View style={s.destinationIcon}><Ionicons name="location-outline" size={17} color={colors.tanzanite} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.destinationName}>{order.ship_recipient || 'Delivery address'}</Text>
            <Text style={s.sub}>{[order.ship_line1, order.ship_city].filter(Boolean).join(', ')}</Text>
            {order.ship_phone && <Text style={s.sub}>{order.ship_phone}</Text>}
          </View>
        </View>
      </>}
      <Text style={s.paymentNote}>{paymentLabel}</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  num: { color: colors.tanzanite, fontSize: 22, fontWeight: '700', letterSpacing: 1 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  section: { color: colors.tanzanite, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.md },
  step: { flexDirection: 'row' },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  dotCurrent: { transform: [{ scale: 1.25 }], borderColor: colors.gold },
  line: { width: 2, flex: 1, minHeight: 28 },
  stepTitle: { color: colors.tanzanite, fontWeight: '700', fontSize: 16 },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 3 },
  itemImage: { width: 54, height: 64, borderRadius: radius.sm, backgroundColor: colors.surface },
  cancelBox: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger },
  destination: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
  destinationIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F7F0D9', alignItems: 'center', justifyContent: 'center' },
  destinationName: { color: colors.tanzanite, fontWeight: '700', fontSize: 14 },
  paymentNote: { color: colors.textMuted, fontSize: 12, marginTop: spacing.lg, textAlign: 'center' },
});
