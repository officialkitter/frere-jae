import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Body, Button, ErrorState, Loading, Pill } from '@/components/ui';
import { useAddToCart, useProduct } from '@/hooks/data';
import { useAuth } from '@/store/auth';
import { formatMoney } from '@/lib/format';
import { colors, radius, spacing, stockState, typography } from '@/theme';
import type { NoteTier } from '@/types';

const TIER_LABEL: Record<NoteTier, string> = { top: 'TOP', middle: 'HEART', base: 'BASE' };

export default function ProductDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const userId = useAuth((s) => s.session?.user.id);
  const { data, isLoading, isError, refetch } = useProduct(slug);
  const addToCart = useAddToCart(userId);
  const [variantId, setVariantId] = useState<string | null>(null);

  const variants = useMemo(
    () => [...(data?.product_variants ?? [])].sort((a, b) => a.size_ml - b.size_ml), [data]);

  useEffect(() => {
    if (!variantId && variants.length) setVariantId((variants.find((v) => v.stock > 0) ?? variants[0])!.id);
  }, [variants, variantId]);

  if (isLoading) return <Loading />;
  if (isError || !data) return <ErrorState message="This fragrance could not be loaded." onRetry={() => refetch()} />;

  const selected = variants.find((v) => v.id === variantId);
  const stock = selected ? stockState(selected.stock, selected.low_stock_threshold) : null;

  async function add() {
    if (!selected) return;
    try {
      await addToCart.mutateAsync({ variantId: selected.id, quantity: 1 });
      Alert.alert('Added to cart', `${data!.name} · ${selected.size_ml} ml`, [
        { text: 'Keep browsing', style: 'cancel' },
        { text: 'View cart', onPress: () => router.push('/(tabs)/cart') },
      ]);
    } catch (e) {
      Alert.alert('Could not add to cart', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Image source={data.image_url ?? undefined} style={s.hero} contentFit="cover" transition={250} />
        <View style={{ padding: spacing.lg }}>
          <Text style={s.family}>{data.concentration.toUpperCase()}</Text>
          <Text style={s.name}>{data.name}</Text>
          {data.tagline && <Text style={s.tagline}>{data.tagline}</Text>}
          {data.description && <Body muted style={{ marginTop: spacing.md, lineHeight: 22 }}>{data.description}</Body>}

          <Text style={s.section}>SCENT PYRAMID</Text>
          {(['top', 'middle', 'base'] as NoteTier[]).map((t) => (
            <View key={t} style={s.noteRow}>
              <Text style={s.noteTier}>{TIER_LABEL[t]}</Text>
              <Text style={s.noteText}>
                {data.product_notes.filter((n) => n.tier === t).map((n) => n.note).join(' · ') || '—'}
              </Text>
            </View>
          ))}

          <Text style={s.section}>SIZE</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {variants.map((v) => {
              const active = v.id === variantId;
              const out = v.stock <= 0;
              return (
                <Pressable key={v.id} onPress={() => setVariantId(v.id)}
                  accessibilityRole="button" accessibilityState={{ selected: active }}
                  accessibilityLabel={`${v.size_ml} millilitres${out ? ', out of stock' : ''}`}
                  style={[s.size, active && { borderColor: colors.gold, backgroundColor: colors.gold }, out && { opacity: 0.55 }]}>
                  <Text style={[s.sizeMl, active && { color: colors.onGold }]}>{v.size_ml} ml</Text>
                  <Text style={[s.sizePrice, active && { color: colors.onGold }]}>{formatMoney(v.price_cents)}</Text>
                  {out && <View style={s.outBar} />}
                </Pressable>
              );
            })}
          </View>
          {stock && <View style={{ marginTop: spacing.md }}><Pill label={stock.label} color={stock.color} /></View>}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Price</Text>
          <Text style={{ color: colors.tanzanite, fontSize: 20, fontWeight: '700' }}>
            {selected ? formatMoney(selected.price_cents) : '—'}
          </Text>
        </View>
        <Button title={stock && !stock.canBuy ? 'SOLD OUT' : 'ADD TO CART'} onPress={add}
          disabled={!selected || !stock?.canBuy} loading={addToCart.isPending} style={{ flex: 1, marginLeft: spacing.lg }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface },
  family: { ...typography.caption, color: colors.gold },
  name: { ...typography.display, color: colors.tanzanite, marginTop: 4 },
  tagline: { color: colors.textMuted, fontStyle: 'italic', marginTop: 4, fontSize: 15 },
  section: { ...typography.caption, color: colors.tanzanite, marginTop: spacing.xl, marginBottom: spacing.sm },
  noteRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  noteTier: { width: 64, ...typography.caption, color: colors.gold },
  noteText: { flex: 1, color: colors.tanzanite, fontSize: 15 },
  size: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', overflow: 'hidden' },
  sizeMl: { color: colors.tanzanite, fontWeight: '700', fontSize: 16 },
  sizePrice: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  outBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: colors.danger },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: spacing.md, paddingBottom: spacing.lg, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
});
