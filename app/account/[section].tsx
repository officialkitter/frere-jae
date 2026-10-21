import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Body, Button, Field, Screen } from '@/components/ui';
import { useAddresses, useDeleteAddress, useSaveAddress } from '@/hooks/data';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useDemoStore, type PaymentMethod, type PreviewReview } from '@/store/demo';
import type { Address } from '@/types';
import { colors, radius, spacing } from '@/theme';

type SectionKey = 'personal-info' | 'addresses' | 'payments' | 'reviews' | 'help' | 'legal' | 'about';
const PAGE: Record<SectionKey, { title: string; eyebrow: string; subtitle: string }> = {
  'personal-info': { title: 'Personal information', eyebrow: 'YOUR DETAILS', subtitle: 'The little details that make each delivery yours.' },
  addresses: { title: 'Saved addresses', eyebrow: 'DELIVERY', subtitle: 'Keep the places you love close at hand.' },
  payments: { title: 'Payment methods', eyebrow: 'PAYMENT', subtitle: 'Choose a preferred way to pay at checkout.' },
  reviews: { title: 'Fragrance reviews', eyebrow: 'THE COMMUNITY', subtitle: 'A few words can help someone find their signature.' },
  help: { title: 'Help centre', eyebrow: 'WE ARE HERE', subtitle: 'Answers for orders, delivery, and your fragrance.' },
  legal: { title: 'Terms & privacy', eyebrow: 'THE IMPORTANT DETAILS', subtitle: 'A clear view of how this preview handles your information.' },
  about: { title: 'About Frère Jae', eyebrow: 'OUR POINT OF VIEW', subtitle: 'A Tanzanian fragrance house, made to be remembered.' },
};
const PAYMENT_OPTIONS: { key: PaymentMethod; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'mobile', title: 'Mobile money', subtitle: 'M-Pesa · Tigo Pesa · Airtel Money', icon: 'phone-portrait-outline' },
  { key: 'card', title: 'Bank card', subtitle: 'Visa · Mastercard', icon: 'card-outline' },
  { key: 'cash', title: 'Cash on delivery', subtitle: 'Pay when your order arrives', icon: 'cash-outline' },
];
const FAQS = [
  { question: 'How long does delivery take?', answer: 'Delivery timing depends on your location. Your order screen shows each stage as it moves from confirmation to delivery.' },
  { question: 'Can I change my delivery address?', answer: 'Contact the Jae as soon as possible after ordering. An address cannot be changed once the parcel is with the courier.' },
  { question: 'How do I choose a fragrance?', answer: 'Explore the scent notes on each fragrance page. Top notes appear first, heart notes shape the character, and base notes linger longest.' },
  { question: 'Are payments live in this preview?', answer: 'No. Payment choices are a frontend demonstration only. No payment credentials are collected and no charge is made.' },
];
export default function AccountSection() {
  const params = useLocalSearchParams<{ section: string }>();
  const section = (params.section in PAGE ? params.section : 'about') as SectionKey;
  const page = PAGE[section];
  const user = useAuth((state) => state.session?.user);
  const userId = user?.id;
  const addresses = useAddresses(userId);
  const saveAddress = useSaveAddress(userId);
  const deleteAddress = useDeleteAddress(userId);
  const guestProfile = useDemoStore((state) => state.guestProfile);
  const updateGuestProfile = useDemoStore((state) => state.updateGuestProfile);
  const preferredPayment = useDemoStore((state) => state.preferredPayment);
  const setPreferredPayment = useDemoStore((state) => state.setPreferredPayment);
  const reviews = useDemoStore((state) => state.reviews);
  const addReview = useDemoStore((state) => state.addReview);
  const entrance = useRef(new Animated.Value(0)).current;
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '' });
  const [addressForm, setAddressForm] = useState({ label: 'Home', recipient: '', phone: '', line1: '', city: '' });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ product: '', text: '' });
  const [rating, setRating] = useState(5);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 450, useNativeDriver: false }).start();
  }, [entrance]);

  useEffect(() => {
    setProfile({
      fullName: (user?.user_metadata?.full_name as string | undefined) ?? guestProfile.fullName,
      email: user?.email ?? guestProfile.email,
      phone: (user?.user_metadata?.phone as string | undefined) ?? guestProfile.phone,
    });
  }, [user, guestProfile]);

  async function saveProfile() {
    setSaved(false);
    if (user) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profile.fullName.trim(), phone: profile.phone.trim() } });
      if (error) { Alert.alert('Could not update your details', error.message); return; }
    } else {
      updateGuestProfile(profile);
    }
    setSaved(true);
  }

  async function addAddress() {
    if (!addressForm.recipient.trim() || !addressForm.phone.trim() || !addressForm.line1.trim() || !addressForm.city.trim()) {
      Alert.alert('Complete the address', 'Add a recipient, phone number, street, and city.');
      return;
    }
    try {
      await saveAddress.mutateAsync({
        label: addressForm.label.trim() || 'Address', recipient: addressForm.recipient.trim(),
        phone: addressForm.phone.trim(), line1: addressForm.line1.trim(), line2: null,
        city: addressForm.city.trim(), region: null, country: 'TZ',
      });
      setAddressForm({ label: 'Home', recipient: '', phone: '', line1: '', city: '' });
      setShowAddressForm(false);
    } catch (error) {
      Alert.alert('Could not save address', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  function confirmRemove(address: Address) {
    Alert.alert('Remove this address?', `${address.line1}, ${address.city}`, [
      { text: 'Keep address', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteAddress.mutate(address.id) },
    ]);
  }

  function submitReview() {
    if (!reviewForm.product.trim() || !reviewForm.text.trim()) {
      Alert.alert('Add your review', 'Choose a fragrance and write a few words first.');
      return;
    }
    addReview({ name: user?.user_metadata?.full_name || 'Guest reviewer', product: reviewForm.product.trim(), rating, text: reviewForm.text.trim() });
    setReviewForm({ product: '', text: '' });
    setShowReviewForm(false);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Text style={s.eyebrow}>{page.eyebrow}</Text>
          <Text style={s.title}>{page.title}</Text>
          <Body muted style={s.subtitle}>{page.subtitle}</Body>
          <View style={s.goldRule} />
        </Animated.View>

        {section === 'personal-info' && <>
          <View style={s.formIntro}><Ionicons name="shield-checkmark-outline" size={18} color={colors.success} /><Text style={s.formIntroText}>{user ? 'Your details are linked to your Jae account.' : 'Guest details stay in this session only.'}</Text></View>
          <Field label="Full name" value={profile.fullName} onChangeText={(fullName) => { setProfile({ ...profile, fullName }); setSaved(false); }} autoComplete="name" />
          <Field label="Email address" value={profile.email} onChangeText={(email) => { setProfile({ ...profile, email }); setSaved(false); }} keyboardType="email-address" autoCapitalize="none" editable={!user} />
          <Field label="Phone number" value={profile.phone} onChangeText={(phone) => { setProfile({ ...profile, phone }); setSaved(false); }} keyboardType="phone-pad" autoComplete="tel" />
          <Button title={saved ? 'SAVED' : 'SAVE DETAILS'} onPress={saveProfile} style={{ marginTop: spacing.sm }} />
          {user && <Text style={s.note}>Your email address can only be changed through account verification.</Text>}
        </>}

        {section === 'addresses' && <>
          {(addresses.data ?? []).length ? (addresses.data ?? []).map((address) => <View key={address.id} style={s.addressRow}>
            <View style={s.addressIcon}><Ionicons name="location-outline" size={18} color={colors.tanzanite} /></View>
            <View style={{ flex: 1 }}><View style={s.addressHeading}><Text style={s.rowTitle}>{address.label}</Text>{address.is_default && <Text style={s.defaultTag}>DEFAULT</Text>}</View><Text style={s.rowDetail}>{address.recipient} · {address.phone}</Text><Text style={s.rowDetail}>{address.line1}, {address.city}</Text></View>
            <Pressable onPress={() => confirmRemove(address)} accessibilityRole="button" accessibilityLabel={`Remove ${address.label} address`}><Ionicons name="trash-outline" size={18} color={colors.textMuted} /></Pressable>
          </View>) : <EmptyState icon="map-outline" title="No saved addresses" detail="Add a delivery address for a quicker checkout." />}
          {!showAddressForm ? <Button title="ADD AN ADDRESS" onPress={() => setShowAddressForm(true)} variant="outline" style={{ marginTop: spacing.md }} /> : <View style={s.formBlock}>
            <Text style={s.formTitle}>NEW DELIVERY ADDRESS</Text>
            <Field label="Address label" value={addressForm.label} onChangeText={(label) => setAddressForm({ ...addressForm, label })} placeholder="Home, office…" />
            <Field label="Recipient" value={addressForm.recipient} onChangeText={(recipient) => setAddressForm({ ...addressForm, recipient })} />
            <Field label="Phone" value={addressForm.phone} onChangeText={(phone) => setAddressForm({ ...addressForm, phone })} keyboardType="phone-pad" />
            <Field label="Street address" value={addressForm.line1} onChangeText={(line1) => setAddressForm({ ...addressForm, line1 })} />
            <Field label="City" value={addressForm.city} onChangeText={(city) => setAddressForm({ ...addressForm, city })} />
            <Button title="SAVE ADDRESS" onPress={addAddress} loading={saveAddress.isPending} />
          </View>}
          {!user && <Text style={s.note}>Saved addresses are available for this session only.</Text>}
        </>}

        {section === 'payments' && <>
          <View style={s.formIntro}><Ionicons name="lock-closed-outline" size={18} color={colors.success} /><Text style={s.formIntroText}>No card numbers or mobile money credentials are stored in this preview.</Text></View>
          <Text style={s.formTitle}>PREFERRED PAYMENT</Text>
          {PAYMENT_OPTIONS.map((option) => <Pressable key={option.key} onPress={() => setPreferredPayment(option.key)} style={[s.paymentRow, preferredPayment === option.key && s.paymentSelected]} accessibilityRole="radio" accessibilityState={{ selected: preferredPayment === option.key }}>
            <View style={s.addressIcon}><Ionicons name={option.icon} size={19} color={colors.tanzanite} /></View>
            <View style={{ flex: 1 }}><Text style={s.rowTitle}>{option.title}</Text><Text style={s.rowDetail}>{option.subtitle}</Text></View>
            <View style={[s.radio, preferredPayment === option.key && s.radioSelected]}>{preferredPayment === option.key && <View style={s.radioDot} />}</View>
          </Pressable>)}
          <Text style={s.note}>Preference is for this preview session. A secure provider will manage live payment details.</Text>
        </>}

        {section === 'reviews' && <>
          <View style={s.reviewTop}><Text style={s.formTitle}>COMMUNITY NOTES</Text><Text style={s.previewPill}>SAMPLE + SESSION REVIEWS</Text></View>
          {reviews.length ? reviews.map((review) => <ReviewRow key={review.id} review={review} />) : <EmptyState icon="star-outline" title="No reviews yet" detail="Share the first note about a fragrance you love." />}
          {!showReviewForm ? <Button title="WRITE A REVIEW" onPress={() => setShowReviewForm(true)} variant="outline" style={{ marginTop: spacing.md }} /> : <View style={s.formBlock}>
            <Text style={s.formTitle}>YOUR FRAGRANCE NOTE</Text>
            <Field label="Fragrance" value={reviewForm.product} onChangeText={(product) => setReviewForm({ ...reviewForm, product })} placeholder="Which scent did you try?" />
            <Text style={s.fieldLabel}>YOUR RATING</Text>
            <View style={s.ratingRow}>{[1, 2, 3, 4, 5].map((value) => <Pressable key={value} onPress={() => setRating(value)} accessibilityRole="button" accessibilityLabel={`${value} stars`}><Ionicons name={value <= rating ? 'star' : 'star-outline'} size={25} color={colors.goldPressed} /></Pressable>)}</View>
            <Field label="Your review" value={reviewForm.text} onChangeText={(text) => setReviewForm({ ...reviewForm, text })} multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 100 }} placeholder="What stood out to you?" />
            <Button title="PUBLISH REVIEW" onPress={submitReview} />
          </View>}
          <Text style={s.note}>Reviews in this preview are stored only for the current session. Account review publishing can be connected before launch.</Text>
        </>}

        {section === 'help' && <>
          <View style={s.helpBanner}><Ionicons name="chatbubbles-outline" size={22} color={colors.tanzanite} /><View style={{ flex: 1 }}><Text style={s.rowTitle}>How can we help?</Text><Text style={s.rowDetail}>Browse quick answers below.</Text></View></View>
          {FAQS.map((faq, index) => <View key={faq.question} style={s.faq}>
            <Pressable onPress={() => setOpenFaq(openFaq === index ? null : index)} style={s.faqQuestion} accessibilityRole="button" accessibilityState={{ expanded: openFaq === index }}>
              <Text style={s.faqTitle}>{faq.question}</Text><Ionicons name={openFaq === index ? 'remove' : 'add'} size={18} color={colors.tanzanite} />
            </Pressable>
            {openFaq === index && <Text style={s.faqAnswer}>{faq.answer}</Text>}
          </View>)}
        </>}

        {section === 'legal' && <>
          <LegalBlock title="Privacy in this preview" text="Guest cart contents may be saved on this device. Guest profile details, saved addresses, reviews, and order delivery details remain in the active session and are not stored as guest history. Signed-in account data is associated with that account." />
          <LegalBlock title="Payments" text="Payment methods shown here are illustrative. No card number, bank detail, or mobile money credential is requested or stored, and no real payment is taken." />
          <LegalBlock title="Orders and delivery" text="Prices, stock, delivery timing, and order status in demo mode are sample data. Live orders and account information are subject to the final store policies." />
          <LegalBlock title="Before launch" text="These preview terms are informational and are not a substitute for the final legal terms and privacy notice." />
        </>}

        {section === 'about' && <>
          <View style={s.aboutMark}><Text style={s.aboutInitial}>FJ</Text><View style={s.aboutLine} /><Text style={s.aboutCaption}>TANZANIA  ·  FRAGRANCE  ·  MEMORY</Text></View>
          <Text style={s.aboutTitle}>Made of place.{ '\n' }Made to stay.</Text>
          <Body muted style={s.aboutBody}>Frère Jae is a fragrance atelier inspired by the colour, warmth, and character of East Africa. Each scent is composed as a small journey: the first impression, the heart, and the note that stays with you.</Body>
          <View style={s.aboutFacts}><Fact label="ROOTED IN" value="Dodoma" /><Fact label="OUR CRAFT" value="Fine fragrance" /><Fact label="OUR PROMISE" value="Wear your story" /></View>
        </>}
      </ScrollView>
    </Screen>
  );
}

function EmptyState({ icon, title, detail }: Readonly<{ icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }>) {
  return <View style={s.empty}><Ionicons name={icon} size={24} color={colors.goldPressed} /><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyDetail}>{detail}</Text></View>;
}

function ReviewRow({ review }: Readonly<{ review: PreviewReview }>) {
  return <View style={s.reviewRow}><View style={s.reviewHeader}><View style={s.reviewAvatar}><Text style={s.reviewInitial}>{review.name.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={s.reviewName}>{review.name}</Text><Text style={s.reviewProduct}>{review.product} · {review.date}</Text></View><View style={s.stars}>{Array.from({ length: review.rating }, (_, index) => <Ionicons key={index} name="star" size={11} color={colors.goldPressed} />)}</View></View><Text style={s.reviewText}>{review.text}</Text>{review.preview && <Text style={s.sampleTag}>PREVIEW REVIEW</Text>}</View>;
}

function LegalBlock({ title, text }: Readonly<{ title: string; text: string }>) {
  return <View style={s.legalBlock}><Text style={s.legalTitle}>{title}</Text><Text style={s.legalText}>{text}</Text></View>;
}

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return <View style={s.fact}><Text style={s.factLabel}>{label}</Text><Text style={s.factValue}>{value}</Text></View>;
}

const s = StyleSheet.create({
  page: { padding: spacing.md, paddingBottom: spacing.xl },
  eyebrow: { color: colors.goldPressed, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.md },
  title: { color: colors.tanzanite, fontSize: 28, lineHeight: 34, fontWeight: '400', marginTop: 5 },
  subtitle: { fontSize: 13, lineHeight: 20, marginTop: 5 },
  goldRule: { width: 42, height: 2, backgroundColor: colors.gold, marginTop: spacing.md, marginBottom: spacing.lg },
  formIntro: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', padding: spacing.md, backgroundColor: '#EFF8F3', borderRadius: radius.sm, marginBottom: spacing.lg },
  formIntroText: { color: colors.tanzanite, fontSize: 12, lineHeight: 17, flex: 1 },
  note: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: spacing.md },
  addressRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  addressIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addressHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { color: colors.tanzanite, fontSize: 14, fontWeight: '700' },
  rowDetail: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  defaultTag: { color: colors.success, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  formBlock: { marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  formTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: spacing.md },
  paymentRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  paymentSelected: { backgroundColor: '#FCF8EB' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.tanzanite },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.tanzanite },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  previewPill: { color: colors.goldPressed, fontSize: 8, fontWeight: '800', letterSpacing: 0.7, borderWidth: 1, borderColor: colors.gold, paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill },
  reviewRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F7F0D9', alignItems: 'center', justifyContent: 'center' },
  reviewInitial: { color: colors.tanzanite, fontWeight: '700' },
  reviewName: { color: colors.tanzanite, fontWeight: '700', fontSize: 12 },
  reviewProduct: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  reviewText: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: spacing.sm },
  sampleTag: { color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.7, marginTop: 6 },
  fieldLabel: { color: colors.tanzanite, fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginBottom: spacing.sm },
  ratingRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  helpBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.sm, marginBottom: spacing.md },
  faq: { borderBottomWidth: 1, borderBottomColor: colors.border },
  faqQuestion: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  faqTitle: { color: colors.tanzanite, fontSize: 13, fontWeight: '600', flex: 1 },
  faqAnswer: { color: colors.textMuted, fontSize: 12, lineHeight: 19, paddingBottom: spacing.md, paddingRight: spacing.lg },
  legalBlock: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  legalTitle: { color: colors.tanzanite, fontWeight: '700', fontSize: 14 },
  legalText: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 6 },
  aboutMark: { alignItems: 'center', paddingVertical: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.sm },
  aboutInitial: { color: colors.tanzanite, fontSize: 52, fontWeight: '300' },
  aboutLine: { width: 32, height: 1, backgroundColor: colors.gold, marginTop: 7 },
  aboutCaption: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 9 },
  aboutTitle: { color: colors.tanzanite, fontSize: 27, lineHeight: 34, fontWeight: '300', marginTop: spacing.lg },
  aboutBody: { fontSize: 14, lineHeight: 22, marginTop: spacing.sm },
  aboutFacts: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  fact: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  factLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  factValue: { color: colors.tanzanite, fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.tanzanite, fontSize: 15, fontWeight: '700', marginTop: spacing.sm },
  emptyDetail: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
