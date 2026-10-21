import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Chip, Empty, ErrorState, Loading, Pill, Screen } from '@/components/ui';
import { useCatalog, useFamilies } from '@/hooks/data';
import { demoProducts } from '@/lib/demo-data';
import { formatMoney } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useDemoStore } from '@/store/demo';
import { colors, radius, spacing } from '@/theme';

export default function Discover() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const user = useAuth((state) => state.session?.user);
  const cartCount = useDemoStore((state) => state.cart.reduce((sum, line) => sum + line.quantity, 0));
  const families = useFamilies();
  const catalog = useCatalog({ query: query.trim(), family, top: [], middle: [], base: [] });
  const intro = useRef(new Animated.Value(0)).current;
  const cardWidth = Math.min(width * 0.71, 310);
  const emptyState = (() => {
    if (catalog.isLoading) return <Loading />;
    if (catalog.isError) return <ErrorState message="We couldn't load the collection." onRetry={() => catalog.refetch()} />;
    return <Empty text="No fragrances match your search." />;
  })();

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [intro]);

  const featured = useMemo(() => demoProducts.slice(0, 4), []);

  return (
    <Screen>
      <FlatList
        data={catalog.data ?? []}
        keyExtractor={(product) => product.id}
        numColumns={2}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        columnWrapperStyle={{ gap: 11, paddingHorizontal: spacing.md }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Animated.View style={{ opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
            <View style={s.topbar}>
              <View>
                <Text style={s.brand}>FRÈRE JAE</Text>
                <Text style={s.edition}>{user ? 'YOUR PRIVATE ATELIER' : 'GUEST DISCOVERY'}</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/cart')} style={s.bag} accessibilityRole="button" accessibilityLabel={`Shopping bag, ${cartCount} items`}>
                <Ionicons name="bag-handle-outline" size={20} color={colors.tanzanite} />
                {cartCount > 0 && <View style={s.bagCount}><Text style={s.bagCountText}>{cartCount}</Text></View>}
              </Pressable>
            </View>

            <View style={s.hero}>
              <Image source={featured[0]!.image_url ?? undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} />
              <View style={s.heroShade} />
              <View style={s.heroCopy}>
                <Text style={s.heroKicker}>SCENT, WITH A SENSE OF PLACE</Text>
                <Text style={s.heroTitle}>A little{ '\n' }more unforgettable.</Text>
                <Text style={s.heroBody}>Discover rare notes, rooted in East Africa.</Text>
                <Pressable onPress={() => router.push(`/product/${featured[0]!.slug}`)} style={s.heroAction}>
                  <Text style={s.heroActionText}>EXPLORE THE COLLECTION</Text><Ionicons name="arrow-forward" size={15} color={colors.onGold} />
                </Pressable>
              </View>
              <Text style={s.heroMark}>01 / 04</Text>
            </View>

            <View style={s.sectionHeading}>
              <View><Text style={s.eyebrow}>THE FRÈRE JAE EDIT</Text><Text style={s.sectionTitle}>Find your signature</Text></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Text style={s.swipeHint}>SWIPE</Text><Ionicons name="arrow-forward" size={12} color={colors.textMuted} /></View>
            </View>
            <FlatList
              horizontal
              data={featured}
              keyExtractor={(item) => `featured-${item.id}`}
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + spacing.sm}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm }}
              renderItem={({ item, index }) => (
                <Pressable onPress={() => router.push(`/product/${item.slug}`)} style={[s.feature, { width: cardWidth }]}>
                  <Image source={item.image_url ?? undefined} style={s.featureImage} contentFit="cover" transition={350} />
                  <View style={s.featureTint} />
                  <View style={s.featureInfo}>
                    <Text style={s.featureNo}>0{index + 1}  /  THE COLLECTION</Text>
                    <Text style={s.featureName}>{item.name}</Text>
                    <Text style={s.featureTag}>{item.tagline}</Text>
                  </View>
                  <View style={s.featureArrow}><Ionicons name="arrow-up" size={15} color={colors.tanzanite} /></View>
                </Pressable>
              )}
            />

            <View style={s.catalogIntro}>
              <View><Text style={s.eyebrow}>CURATED FOR YOU</Text><Text style={s.sectionTitle}>The collection</Text></View>
              <Text style={s.count}>{catalog.data?.length ?? 0} FRAGRANCES</Text>
            </View>
            <View style={s.searchRow}>
              <View style={s.search}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput value={query} onChangeText={setQuery} placeholder="Search notes or fragrance" placeholderTextColor={colors.textMuted}
                  style={s.searchInput} returnKeyType="search" accessibilityLabel="Search fragrances" />
              </View>
              <Pressable onPress={() => setShowFilters((value) => !value)} style={[s.filterButton, showFilters && s.filterActive]} accessibilityRole="button" accessibilityLabel="Filter fragrance family">
                <Ionicons name="options-outline" size={19} color={showFilters ? colors.onGold : colors.tanzanite} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.familyRow}>
              <Chip label="All scents" active={family === null} onPress={() => setFamily(null)} />
              {(families.data ?? []).map((item) => <Chip key={item.id} label={item.name} active={family === item.id} onPress={() => setFamily(item.id)} />)}
            </ScrollView>
            {showFilters && <Text style={s.filterNote}>Browse by scent family. More note filters are available on each fragrance detail.</Text>}
          </Animated.View>
        }
        renderItem={({ item }) => (
          <Pressable style={s.product} onPress={() => router.push(`/product/${item.slug}`)} accessibilityRole="button" accessibilityLabel={item.name}>
            <View style={s.productPhoto}>
              <Image source={item.image_url ?? undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
              <View style={s.productLabel}><Text style={s.productLabelText}>{item.concentration.toUpperCase()}</Text></View>
            </View>
            <Text style={s.productName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.productTag} numberOfLines={1}>{item.tagline}</Text>
            <View style={s.priceLine}><Text style={s.productPrice}>{formatMoney(item.min_price ?? 0)}</Text><Ionicons name="add-circle-outline" size={19} color={colors.tanzanite} /></View>
            <Pill label={item.sold_out ? 'Sold out' : 'Ready to ship'} color={item.sold_out ? colors.danger : colors.success} />
          </Pressable>
        )}
        ListEmptyComponent={emptyState}
        ListFooterComponent={<View style={s.footerNote}><Text style={s.footerBrand}>FRÈRE JAE</Text><Text style={s.footerText}>Crafted to be remembered.</Text></View>}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  topbar: { minHeight: 68, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.tanzanite, fontSize: 13, fontWeight: '800', letterSpacing: 1.7 },
  edition: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginTop: 5 },
  bag: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bagCount: { position: 'absolute', right: -3, top: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  bagCountText: { color: colors.onGold, fontSize: 10, fontWeight: '800' },
  hero: { height: 390, marginHorizontal: spacing.sm, borderRadius: radius.md, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#263443' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12, 18, 25, 0.38)' },
  heroCopy: { padding: spacing.lg, paddingBottom: 35 },
  heroKicker: { color: '#F0D793', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { color: '#FFFFFF', fontSize: 37, lineHeight: 43, fontWeight: '300', marginTop: 10 },
  heroBody: { color: 'rgba(255,255,255,0.86)', fontSize: 13, marginTop: 9 },
  heroAction: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.gold, paddingHorizontal: 15, paddingVertical: 12, marginTop: 20, borderRadius: 2 },
  heroActionText: { color: colors.onGold, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroMark: { position: 'absolute', right: spacing.md, top: spacing.md, color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  sectionHeading: { paddingHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  eyebrow: { color: colors.goldPressed, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  sectionTitle: { color: colors.tanzanite, fontSize: 22, fontWeight: '400', marginTop: 5 },
  swipeHint: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  feature: { height: 175, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.surface },
  featureImage: { ...StyleSheet.absoluteFillObject },
  featureTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 20, 29, 0.28)' },
  featureInfo: { position: 'absolute', left: spacing.md, bottom: spacing.md, right: 50 },
  featureNo: { color: '#F1D995', fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  featureName: { color: '#FFFFFF', fontSize: 20, fontWeight: '600', marginTop: 6 },
  featureTag: { color: 'rgba(255,255,255,0.86)', fontSize: 11, marginTop: 3 },
  featureArrow: { position: 'absolute', right: spacing.md, bottom: spacing.md, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  catalogIntro: { marginTop: spacing.xl, paddingHorizontal: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  count: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginTop: spacing.md },
  search: { flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, backgroundColor: colors.background },
  searchInput: { flex: 1, paddingVertical: 9, marginLeft: spacing.sm, color: colors.tanzanite, fontSize: 14 },
  filterButton: { width: 46, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  familyRow: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  filterNote: { color: colors.textMuted, fontSize: 11, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  product: { flex: 1, marginBottom: spacing.lg, paddingBottom: spacing.sm },
  productPhoto: { width: '100%', aspectRatio: 0.84, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.surface },
  productLabel: { position: 'absolute', left: 8, top: 8, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 7, paddingVertical: 5 },
  productLabelText: { color: colors.tanzanite, fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  productName: { color: colors.tanzanite, fontSize: 14, fontWeight: '700', marginTop: 9 },
  productTag: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 7 },
  productPrice: { color: colors.tanzanite, fontSize: 13, fontWeight: '700' },
  footerNote: { alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginHorizontal: spacing.md, paddingVertical: spacing.xl, marginTop: spacing.sm },
  footerBrand: { color: colors.tanzanite, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  footerText: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
});
