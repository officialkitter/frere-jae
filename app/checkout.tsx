import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Body, Button, Field } from '@/components/ui';
import { useAddresses, useCart, useSaveAddress } from '@/hooks/data';
import { useAuth } from '@/store/auth';
import { useDemoStore, type DemoDelivery } from '@/store/demo';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const FREE_SHIPPING_CENTS = 20_000_000;
const SHIPPING_CENTS = 1_000_000;

export default function Checkout() {
  const router = useRouter();
  const userId = useAuth((state) => state.session?.user.id);
  const cart = useCart(userId);
  const addresses = useAddresses(userId);
  const saveAddress = useSaveAddress(userId);
  const setCheckoutDraft = useDemoStore((state) => state.setCheckoutDraft);
  const [addressId, setAddressId] = useState<string | undefined>();
  const [delivery, setDelivery] = useState<DemoDelivery>({ recipient: '', phone: '', line1: '', city: '' });
  const [locating, setLocating] = useState(false);

  const lines = cart.data ?? [];
  const subtotal = lines.reduce((sum, line) => sum + line.product_variants.price_cents * line.quantity, 0);
  const shipping = subtotal >= FREE_SHIPPING_CENTS || subtotal === 0 ? 0 : SHIPPING_CENTS;
  const savedAddresses = addresses.data ?? [];

  useEffect(() => {
    if (!addressId && savedAddresses.length) setAddressId(savedAddresses[0]!.id);
  }, [addressId, savedAddresses]);

  async function detectLocation() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Location unavailable', 'Allow location access in your device settings, or enter your address manually.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync(position.coords);
      if (!place) throw new Error('We could not find a street address near you.');
      const street = [place.name, place.street].filter(Boolean).join(' ');
      const area = [place.district, place.subregion].filter(Boolean).join(', ');
      setDelivery((current) => ({
        ...current,
        line1: [street, place.city && place.city !== area ? place.city : null].filter(Boolean).join(', '),
        city: place.city || area || place.region || '',
      }));
    } catch (error) {
      Alert.alert('Could not detect location', error instanceof Error ? error.message : 'Enter your delivery address manually.');
    } finally {
      setLocating(false);
    }
  }

  async function continueToPayment() {
    if (!lines.length) return;
    try {
      let nextAddressId = addressId;
      let nextDelivery = delivery;
      if (savedAddresses.length && addressId) {
        const selected = savedAddresses.find((address) => address.id === addressId);
        if (selected) nextDelivery = selected;
      } else {
        if (!delivery.recipient.trim() || !delivery.phone.trim() || !delivery.line1.trim() || !delivery.city.trim()) {
          Alert.alert('Delivery details', 'Complete your name, phone, street address, and city to continue.');
          return;
        }
        if (userId) {
          const saved = await saveAddress.mutateAsync({
            label: 'Delivery', ...delivery, line2: null, region: null, country: 'TZ',
          });
          nextAddressId = saved.id;
        }
      }
      setCheckoutDraft({ addressId: nextAddressId, delivery: nextDelivery });
      router.push('/payment');
    } catch (error) {
      Alert.alert('Could not save delivery details', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  if (cart.isLoading || addresses.isLoading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.gold} /></View>;

  return (
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      <View style={s.progress}>
        <Step number="1" label="Delivery" active />
        <View style={s.progressLine} />
        <Step number="2" label="Payment" />
        <View style={s.progressLine} />
        <Step number="3" label="Tracking" />
      </View>
      <Text style={s.title}>Where to?</Text>
      <Body muted style={{ marginTop: 4 }}>Your fragrance deserves a beautiful arrival.</Body>

      {savedAddresses.length > 0 ? (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={s.label}>SAVED ADDRESSES</Text>
          {savedAddresses.map((address) => (
            <Text key={address.id} onPress={() => setAddressId(address.id)} style={[s.address, addressId === address.id && s.addressActive]}>
              {address.label} · {address.line1}, {address.city}{addressId === address.id ? '  ✓' : ''}
            </Text>
          ))}
          <Text onPress={() => setAddressId(undefined)} style={s.addAddress}>+ Use a different address</Text>
        </View>
      ) : null}

      {(!savedAddresses.length || !addressId) && (
        <View style={{ marginTop: spacing.lg }}>
          <Button title={locating ? 'FINDING YOUR ADDRESS…' : 'USE MY CURRENT LOCATION'} onPress={detectLocation}
            variant="outline" loading={locating} style={s.locationButton} />
          <Field label="Recipient name" value={delivery.recipient} onChangeText={(recipient) => setDelivery({ ...delivery, recipient })} autoComplete="name" />
          <Field label="Phone number" value={delivery.phone} onChangeText={(phone) => setDelivery({ ...delivery, phone })} keyboardType="phone-pad" autoComplete="tel" />
          <Field label="Street address" value={delivery.line1} onChangeText={(line1) => setDelivery({ ...delivery, line1 })} />
          <Field label="City" value={delivery.city} onChangeText={(city) => setDelivery({ ...delivery, city })} />
        </View>
      )}

      <View style={s.summary}>
        <Text style={s.label}>ORDER SUMMARY · {lines.length} {lines.length === 1 ? 'ITEM' : 'ITEMS'}</Text>
        <Line label="Subtotal" value={formatMoney(subtotal)} />
        <Line label="Delivery" value={shipping ? formatMoney(shipping) : 'Complimentary'} />
        <View style={s.rule} />
        <Line label="Total" value={formatMoney(subtotal + shipping)} bold />
      </View>
      <View style={s.privacy}><Ionicons name="shield-checkmark-outline" size={17} color={colors.success} /><Text style={s.privacyText}>{userId ? 'Your delivery details are stored securely with your account.' : 'Guest delivery details are kept only for this session.'}</Text></View>
      <Button title="CONTINUE TO PAYMENT" onPress={continueToPayment} disabled={!lines.length || saveAddress.isPending}
        loading={saveAddress.isPending} style={{ marginTop: spacing.lg }} />
      <Text style={s.demoLabel}>DEMO CHECKOUT · NO PAYMENT WILL BE CHARGED</Text>
    </ScrollView>
  );
}

function Step({ number, label, active }: Readonly<{ number: string; label: string; active?: boolean }>) {
  return <View style={{ alignItems: 'center', gap: 5 }}><View style={[s.stepDot, active && s.stepActive]}><Text style={[s.stepNumber, active && { color: colors.onGold }]}>{number}</Text></View><Text style={[s.stepLabel, active && { color: colors.tanzanite }]}>{label}</Text></View>;
}

function Line({ label, value, bold }: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return <View style={s.line}><Text style={[s.lineLabel, bold && { color: colors.tanzanite }]}>{label}</Text><Text style={[s.lineValue, bold && s.lineTotal]}>{value}</Text></View>;
}

const s = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: spacing.md },
  progressLine: { width: 38, height: 1, backgroundColor: colors.border, marginHorizontal: 8, marginBottom: 19 },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  stepNumber: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  stepLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },
  title: { color: colors.tanzanite, fontSize: 30, fontWeight: '300', marginTop: spacing.sm },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm },
  locationButton: { marginBottom: spacing.lg },
  address: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.textMuted, marginBottom: spacing.sm },
  addressActive: { borderColor: colors.gold, color: colors.tanzanite, backgroundColor: '#FCF8EB' },
  addAddress: { color: colors.tanzanite, fontWeight: '700', paddingVertical: spacing.sm },
  summary: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  lineLabel: { color: colors.textMuted, fontSize: 14 },
  lineValue: { color: colors.tanzanite, fontSize: 14, fontWeight: '600' },
  lineTotal: { fontSize: 18, fontWeight: '800' },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md },
  privacyText: { color: colors.textMuted, flex: 1, fontSize: 12 },
  demoLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: spacing.md },
});
