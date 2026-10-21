import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography, orderStatusStyle, type OrderStatus } from '@/theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={[s.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Heading({ children }: { children: React.ReactNode }) {
  return <Text style={s.heading} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  return <Text style={[s.body, muted && { color: colors.textMuted }, style]}>{children}</Text>;
}

interface ButtonProps {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'outline'; style?: ViewStyle;
}
export function Button({ title, onPress, loading, disabled, variant = 'primary', style }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      style={({ pressed }) => [
        s.btn,
        variant === 'primary'
          ? { backgroundColor: pressed ? colors.goldPressed : colors.gold }
          : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.gold },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={colors.onGold} />
        : <Text style={[s.btnText, variant === 'outline' && { color: colors.tanzanite }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[s.input, style]}
        accessibilityLabel={label}
        {...rest}
      />
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={[s.chip, active && { backgroundColor: colors.gold, borderColor: colors.gold }]}
    >
      <Text style={[s.chipText, active && { color: colors.onGold, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const st = orderStatusStyle[status];
  return (
    <View style={[s.badge, { backgroundColor: st.bg }]}>
      <Text style={[s.badgeText, { color: st.fg }]}>{st.label.toUpperCase()}</Text>
    </View>
  );
}

export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ color, ...typography.caption }}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return <View style={s.center}><ActivityIndicator size="large" color={colors.gold} /></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.center}>
      <Text style={[s.body, { textAlign: 'center', marginBottom: spacing.md }]}>{message}</Text>
      {onRetry && <Button title="Try again" onPress={onRetry} variant="outline" />}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <View style={s.center}><Text style={[s.body, { color: colors.textMuted }]}>{text}</Text></View>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heading: { ...typography.display, color: colors.tanzanite },
  body: { ...typography.body, color: colors.text },
  btn: { paddingVertical: 15, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  btnText: { color: colors.onGold, fontWeight: '700', letterSpacing: 1, fontSize: 15 },
  label: { ...typography.caption, color: colors.tanzanite, marginBottom: 6, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: 16, color: colors.tanzanite, backgroundColor: colors.background },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm, marginBottom: spacing.sm },
  chipText: { color: colors.tanzanite, fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
});
