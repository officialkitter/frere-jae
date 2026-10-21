import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { useCart, usePlaceOrder } from '@/hooks/data';
import { useAuth } from '@/store/auth';
import { useDemoStore, type PaymentMethod } from '@/store/demo';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const METHODS: { key: PaymentMethod; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'mobile', title: 'Mobile money', detail: 'M-Pesa · Tigo Pesa · Airtel Money', icon: 'phone-portrait-outline' },
  { key: 'card', title: 'Bank card', detail: 'Visa · Mastercard', icon: 'card-outline' },
  { key: 'cash', title: 'Cash on delivery', detail: 'Pay when your order arrives', icon: 'cash-outline' },
];

export default function Payment() {
  const router = useRouter();
  const userId = useAuth((state) => state.session?.user.id);
  const cart = useCart(userId);
  const placeOrder = usePlaceOrder(userId);
  const draft = useDemoStore((state) => state.checkoutDraft);
  const preferredPayment = useDemoStore((state) => state.preferredPayment);
  const [method, setMethod] = useState<PaymentMethod>(preferredPayment);
  const lines = cart.data ?? [];
  const subtotal = lines.reduce((sum, line) => sum + line.product_variants.price_cents * line.quantity, 0);
  const total = subtotal + (subtotal >= 20_000_000 || subtotal === 0 ? 0 : 1_000_000);

  async function pay() {
    if (!draft) {
      Alert.alert('Delivery details needed', 'Return to checkout and confirm a delivery address.');
      router.replace('/checkout');
      return;
    }
    try {
      const orderId = await placeOrder.mutateAsync({ ...draft, paymentMethod: method });
      router.replace(`/order/${orderId}`);
    } catch (error) {
      Alert.alert('Order could not be completed', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.progress}>
        <Step number="1" label="Delivery" done /><View style={s.progressLine} />
        <Step number="2" label="Payment" active /><View style={s.progressLine} />
        <Step number="3" label="Tracking" />
      </View>
      <Text style={s.title}>Make it yours</Text>
      <Text style={s.subtitle}>Choose how you would like to pay.</Text>

      <View style={s.methods}>
        {METHODS.map((item) => {
          const selected = item.key === method;
          return <Pressable key={item.key} onPress={() => setMethod(item.key)} style={[s.method, selected && s.methodActive]} accessibilityRole="radio" accessibilityState={{ selected }}>
            <View style={s.methodRow}>
              <Ionicons name={item.icon} size={22} color={selected ? colors.tanzanite : colors.textMuted} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={s.methodTitle}>{item.title}</Text>
                <Text style={s.methodDetail}>{item.detail}</Text>
              </View>
              <View style={[s.radio, selected && s.radioActive]}>{selected && <View style={s.radioDot} />}</View>
            </View>
          </Pressable>;
        })}
      </View>

      <View style={s.notice}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.success} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={s.noticeTitle}>Protected checkout</Text>
          <Text style={s.noticeText}>This preview simulates payment approval. No card or mobile money details are collected and no charge is made.</Text>
        </View>
      </View>

      <View style={s.totalRow}><Text style={s.totalLabel}>Order total</Text><Text style={s.total}>{formatMoney(total)}</Text></View>
      <Button title={method === 'cash' ? 'CONFIRM ORDER' : 'SIMULATE SECURE PAYMENT'} onPress={pay}
        loading={placeOrder.isPending} disabled={!lines.length} style={{ marginTop: spacing.lg }} />
      <Text style={s.footnote}>Payment provider integration can replace this simulation before launch.</Text>
    </ScrollView>
  );
}

type StepProps = {
  readonly number: string;
  readonly label: string;
  readonly active?: boolean;
  readonly done?: boolean;
};

function Step({ number, label, active, done }: StepProps) {
  return <View style={{ alignItems: 'center', gap: 5 }}><View style={[s.stepDot, (active || done) && s.stepActive]}>
    {done ? <Ionicons name="checkmark" size={14} color={colors.onGold} /> : <Text style={[s.stepNumber, active && { color: colors.onGold }]}>{number}</Text>}
  </View><Text style={[s.stepLabel, (active || done) && { color: colors.tanzanite }]}>{label}</Text></View>;
}

const s = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
  progressLine: { width: 38, height: 1, backgroundColor: colors.border, marginHorizontal: 8, marginBottom: 19 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepNumber: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  stepLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  title: { color: colors.tanzanite, fontSize: 30, fontWeight: '300', marginTop: spacing.sm },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
  methods: { marginTop: spacing.lg },
  method: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  methodActive: { borderColor: colors.gold, backgroundColor: '#FCF8EB' },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodTitle: { color: colors.tanzanite, fontWeight: '700', fontSize: 15 },
  methodDetail: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.tanzanite },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.tanzanite },
  notice: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: radius.md, padding: spacing.md, backgroundColor: '#EFF8F3', marginTop: spacing.md },
  noticeTitle: { color: colors.tanzanite, fontWeight: '700', fontSize: 13 },
  noticeText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.xl, paddingTop: spacing.md },
  totalLabel: { color: colors.tanzanite, fontSize: 16, fontWeight: '600' },
  total: { color: colors.tanzanite, fontSize: 22, fontWeight: '800' },
  footnote: { color: colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.md },
});
