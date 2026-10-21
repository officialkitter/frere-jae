import { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Screen } from '@/components/ui';
import { demoProducts } from '@/lib/demo-data';
import { useAuth } from '@/store/auth';
import { colors, radius, spacing } from '@/theme';

type AccountSection = 'personal-info' | 'addresses' | 'payments' | 'reviews' | 'help' | 'legal' | 'about';
const groups: { title: string; items: { key: AccountSection; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] }[] = [
  { title: 'YOUR DETAILS', items: [
    { key: 'personal-info', label: 'Personal information', detail: 'Name, email and phone', icon: 'person-outline' },
    { key: 'addresses', label: 'Saved addresses', detail: 'Where your orders arrive', icon: 'location-outline' },
    { key: 'payments', label: 'Payment methods', detail: 'Choose how you pay', icon: 'card-outline' },
  ] },
  { title: 'THE JAE', items: [
    { key: 'reviews', label: 'Your reviews', detail: 'Notes from the community', icon: 'star-outline' },
    { key: 'about', label: 'About Frère Jae', detail: 'Our story and point of view', icon: 'sparkles-outline' },
  ] },
  { title: 'HERE TO HELP', items: [
    { key: 'help', label: 'Help centre', detail: 'Delivery, orders and fragrance', icon: 'chatbubble-ellipses-outline' },
    { key: 'legal', label: 'Terms & privacy', detail: 'How this preview handles data', icon: 'document-text-outline' },
  ] },
];

export default function Profile() {
  const { session, signOut, biometricAvailable, biometricEnabled, setBiometric } = useAuth();
  const entrance = useRef(new Animated.Value(0)).current;
  const name = session?.user.user_metadata?.full_name as string | undefined;
  const firstName = name?.split(' ')[0];
  let welcome = 'Welcome to your Jae.';
  if (session) {
    welcome = 'Welcome back.';
    if (firstName) welcome = `Welcome, ${firstName}.`;
  }

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 550, useNativeDriver: false }).start();
  }, [entrance]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false}>
        <View style={s.topline}><Text style={s.kicker}>FRÈRE JAE</Text><Text style={s.memberState}>{session ? 'MEMBER' : 'GUEST'}</Text></View>
        <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <View style={s.hero}>
            <Image source={demoProducts[1]!.image_url ?? undefined} style={StyleSheet.absoluteFill} contentFit="cover" transition={450} />
            <View style={s.heroShade} />
            <View style={s.heroCopy}>
              <Text style={s.heroEyebrow}>{session ? 'YOUR PRIVATE ATELIER' : 'A MOMENT, JUST FOR YOU'}</Text>
              <Text style={s.heroTitle}>{welcome}</Text>
              <Text style={s.heroSubtitle}>{session ? session.user.email : 'Your next signature scent begins here.'}</Text>
            </View>
            <View style={s.avatar}><Ionicons name={session ? 'person-outline' : 'sparkles-outline'} size={22} color={colors.tanzanite} /></View>
          </View>
        </Animated.View>

        {!session ? (
          <View style={s.guestMessage}>
            <Ionicons name="lock-closed-outline" size={17} color={colors.goldPressed} />
            <Text style={s.guestMessageText}>Guest orders are available this session. Sign in to keep your order history with your account.</Text>
          </View>
        ) : (
          <View style={s.securityRow}>
            <View style={s.securityIcon}><Ionicons name="finger-print-outline" size={19} color={colors.tanzanite} /></View>
            <View style={{ flex: 1 }}><Text style={s.securityTitle}>Biometric unlock</Text><Text style={s.securityDetail}>{biometricAvailable ? 'Face ID or fingerprint' : 'Unavailable on this device'}</Text></View>
            <Switch value={biometricEnabled} disabled={!biometricAvailable} onValueChange={(value) => { void setBiometric(value); }}
              trackColor={{ true: colors.gold, false: colors.border }} thumbColor="#fff" accessibilityLabel="Biometric unlock" />
          </View>
        )}

        <Link href="/(tabs)/orders" asChild><Pressable style={s.orderLink}>
          <View><Text style={s.orderEyebrow}>YOUR FRAGRANCE JOURNEY</Text><Text style={s.orderTitle}>Orders & tracking</Text></View>
          <View style={s.orderArrow}><Ionicons name="arrow-forward" size={17} color={colors.onGold} /></View>
        </Pressable></Link>

        {groups.map((group) => <View key={group.title} style={s.group}>
          <Text style={s.groupTitle}>{group.title}</Text>
          {group.items.map((item) => <Link key={item.key} href={{ pathname: '/account/[section]', params: { section: item.key } }} asChild>
            <Pressable style={s.menuRow} accessibilityRole="button">
              <View style={s.menuIcon}><Ionicons name={item.icon} size={19} color={colors.tanzanite} /></View>
              <View style={{ flex: 1 }}><Text style={s.menuLabel}>{item.label}</Text><Text style={s.menuDetail}>{item.detail}</Text></View>
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            </Pressable>
          </Link>)}
        </View>)}

        {!session ? <View style={s.authArea}>
          <Text style={s.authTitle}>Keep your Jae close.</Text>
          <Text style={s.authCopy}>Create an account to carry your orders and preferences with you.</Text>
          <Link href="/(auth)/login" style={s.authPrimary}>SIGN IN</Link>
          <Link href="/(auth)/register" style={s.authSecondary}>CREATE AN ACCOUNT</Link>
        </View> : <Button title="SIGN OUT" variant="outline" onPress={() => signOut()} style={{ marginTop: spacing.lg }} />}
        <Link href="/(tabs)/cart" asChild><Pressable style={s.bagLink}><Ionicons name="bag-outline" size={17} color={colors.textMuted} /><Text style={s.bagText}>View your bag</Text></Pressable></Link>
        <Text style={s.footer}>DODOMA  ·  EST. 2026</Text>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  kicker: { color: colors.tanzanite, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  memberState: { color: colors.goldPressed, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  hero: { height: 205, borderRadius: radius.md, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.tanzanite, marginTop: spacing.sm },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 20, 22, 0.48)' },
  heroCopy: { padding: spacing.md, paddingBottom: spacing.lg, paddingRight: 65 },
  heroEyebrow: { color: '#E8D18A', fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  heroTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '400', marginTop: 8 },
  heroSubtitle: { color: 'rgba(255,255,255,0.84)', fontSize: 12, marginTop: 5 },
  avatar: { position: 'absolute', right: spacing.md, bottom: spacing.md, width: 42, height: 42, borderRadius: 21, backgroundColor: '#F6EFD8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  guestMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: spacing.md, backgroundColor: '#FCF8EB', borderRadius: radius.sm, marginTop: spacing.md },
  guestMessageText: { flex: 1, color: colors.tanzanite, fontSize: 12, lineHeight: 18 },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, marginTop: spacing.md },
  securityIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  securityTitle: { color: colors.tanzanite, fontWeight: '700', fontSize: 13 },
  securityDetail: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  orderLink: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.tanzanite, borderRadius: radius.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderEyebrow: { color: '#E8D18A', fontSize: 9, fontWeight: '700', letterSpacing: 1.1 },
  orderTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 5 },
  orderArrow: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold },
  group: { marginTop: spacing.lg },
  groupTitle: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginBottom: spacing.xs },
  menuRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { color: colors.tanzanite, fontSize: 14, fontWeight: '700' },
  menuDetail: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  authArea: { padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm, marginTop: spacing.xl },
  authTitle: { color: colors.tanzanite, fontSize: 17, fontWeight: '600' },
  authCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: spacing.md },
  authPrimary: { color: colors.onGold, backgroundColor: colors.gold, textAlign: 'center', overflow: 'hidden', borderRadius: radius.pill, paddingVertical: 14, fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: spacing.sm },
  authSecondary: { color: colors.tanzanite, textAlign: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: colors.gold, borderRadius: radius.pill, paddingVertical: 13, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  bagLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, marginTop: spacing.sm },
  bagText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  footer: { color: colors.textMuted, fontSize: 9, letterSpacing: 1.2, textAlign: 'center', marginTop: spacing.md },
});
