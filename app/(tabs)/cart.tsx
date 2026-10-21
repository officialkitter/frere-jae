import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, ErrorState, Loading, Pill, Screen } from '@/components/ui';
import { useCart, useUpdateCart } from '@/hooks/data';
import { useAuth } from '@/store/auth';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing, stockState } from '@/theme';

export default function Cart() {
  const router = useRouter();
  const userId = useAuth((s) => s.session?.user.id);
  const cart = useCart(userId);
  const update = useUpdateCart(userId);

  if (cart.isLoading) return <Loading />;
  if (cart.isError) return <ErrorState message="Could not load your cart." onRetry={() => cart.refetch()} />;

  const lines = cart.data ?? [];
  if (!lines.length) return <Screen><Empty text="Your cart is empty." /></Screen>;

  const subtotal = lines.reduce((sum, l) => sum + l.product_variants.price_cents * l.quantity, 0);
  const hasProblem = lines.some((l) => l.product_variants.stock < l.quantity);

  return (
    <Screen>
      <FlatList
        data={lines}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: spacing.md }}
        renderItem={({ item }) => {
          const v = item.product_variants;
          const st = stockState(v.stock, v.low_stock_threshold);
          const short = v.stock < item.quantity;
          return (
            <View style={s.row}>
              <Image source={v.products.image_url ?? undefined} style={s.thumb} contentFit="cover" />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={s.name}>{v.products.name}</Text>
                <Text style={s.sub}>{v.size_ml} ml · {formatMoney(v.price_cents)}</Text>
                <View style={{ marginTop: 4 }}><Pill label={short ? 'Not enough stock' : st.label} color={short ? colors.danger : st.color} /></View>
                <View style={s.qtyRow}>
                  <Pressable style={s.qtyBtn} onPress={() => update.mutate({ id: item.id, quantity: item.quantity - 1 })}
                    accessibilityRole="button" accessibilityLabel="Decrease quantity">
                    <Ionicons name={item.quantity === 1 ? 'trash-outline' : 'remove'} size={16} color={colors.tanzanite} />
                  </Pressable>
                  <Text style={s.qty}>{item.quantity}</Text>
                  <Pressable style={s.qtyBtn} onPress={() => update.mutate({ id: item.id, quantity: item.quantity + 1 })}
                    disabled={item.quantity >= Math.min(10, v.stock)} accessibilityRole="button" accessibilityLabel="Increase quantity">
                    <Ionicons name="add" size={16} color={colors.tanzanite} />
                  </Pressable>
                </View>
              </View>
              <Text style={s.lineTotal}>{formatMoney(v.price_cents * item.quantity)}</Text>
            </View>
          );
        }}
      />
      <View style={s.footer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <Text style={{ color: colors.textMuted }}>Subtotal</Text>
          <Text style={{ color: colors.tanzanite, fontWeight: '700', fontSize: 18 }}>{formatMoney(subtotal)}</Text>
        </View>
        <Button title="CHECKOUT" onPress={() => router.push('/checkout')} disabled={hasProblem} />
        {hasProblem && <Text style={{ color: colors.danger, marginTop: spacing.sm, textAlign: 'center' }}>Adjust items that exceed available stock.</Text>}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  thumb: { width: 84, height: 84, borderRadius: radius.md, backgroundColor: colors.surface },
  name: { color: colors.tanzanite, fontWeight: '700', fontSize: 16 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 36, textAlign: 'center', color: colors.tanzanite, fontWeight: '700' },
  lineTotal: { color: colors.tanzanite, fontWeight: '700' },
  footer: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
});
