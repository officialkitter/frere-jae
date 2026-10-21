export const colors = {
  background: '#FFFFFF',
  surface: '#F7F8FC',
  border: '#E3E6F0',

  // Brand
  tanzanite: '#002FA7', // headers + text
  gold: '#D4AF37',      // primary buttons + active states
  goldPressed: '#B8962E',
  text: '#002FA7',
  textMuted: '#5B6B9A',
  onGold: '#1A1A1A',

  // Semantic status system
  success: '#10B981',   // Emerald — in stock / delivered
  warning: '#F59E0B',   // Amber — pending / low stock
  danger: '#DC143C',    // Crimson — out of stock / cancelled
  transit: '#AEC6F6',   // Pastel blue — in transit
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const typography = {
  display: { fontSize: 30, fontWeight: '300' as const, letterSpacing: 1.5 },
  title: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.5 },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.8 },
};

export type OrderStatus =
  | 'pending' | 'confirmed' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';

export const orderStatusStyle: Record<OrderStatus, { label: string; bg: string; fg: string }> = {
  pending:    { label: 'Pending',    bg: colors.warning, fg: '#4A2F00' },
  confirmed:  { label: 'Confirmed',  bg: colors.success, fg: '#FFFFFF' },
  processing: { label: 'Processing', bg: colors.warning, fg: '#4A2F00' },
  in_transit: { label: 'In Transit', bg: colors.transit, fg: colors.tanzanite },
  delivered:  { label: 'Delivered',  bg: colors.success, fg: '#FFFFFF' },
  cancelled:  { label: 'Cancelled',  bg: colors.danger,  fg: '#FFFFFF' },
};

export function stockState(stock: number, threshold: number) {
  if (stock <= 0) return { label: 'Out of stock', color: colors.danger, canBuy: false };
  if (stock <= threshold) return { label: `Only ${stock} left`, color: colors.warning, canBuy: true };
  return { label: 'In stock', color: colors.success, canBuy: true };
}
