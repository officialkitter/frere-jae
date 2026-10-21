import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { demoProducts } from '@/lib/demo-data';
import type { Address, CartLine, Order, OrderEvent, OrderItem } from '@/types';
import type { OrderStatus } from '@/theme';

export type DemoDelivery = Pick<Address, 'recipient' | 'phone' | 'line1' | 'city'>;
export type PaymentMethod = 'card' | 'mobile' | 'cash';
export interface CheckoutDraft { addressId?: string; delivery: DemoDelivery }
export interface DemoOrderItem extends OrderItem { image_url: string | null }
export interface DemoOrderDetail {
  order: Order;
  items: DemoOrderItem[];
  events: OrderEvent[];
  paymentMethod: PaymentMethod;
}
export interface GuestProfile { fullName: string; email: string; phone: string }
export interface PreviewReview { id: string; name: string; product: string; rating: number; text: string; date: string; preview: boolean }

interface DemoState {
  cart: CartLine[];
  orders: DemoOrderDetail[];
  addresses: Address[];
  guestProfile: GuestProfile;
  preferredPayment: PaymentMethod;
  reviews: PreviewReview[];
  checkoutDraft: CheckoutDraft | null;
  addToCart: (variantId: string, quantity: number) => void;
  updateCart: (lineId: string, quantity: number) => void;
  addAddress: (address: Omit<Address, 'id' | 'is_default'>) => Address;
  removeAddress: (addressId: string) => void;
  updateGuestProfile: (profile: Partial<GuestProfile>) => void;
  setPreferredPayment: (method: PaymentMethod) => void;
  addReview: (review: Omit<PreviewReview, 'id' | 'date' | 'preview'>) => void;
  setCheckoutDraft: (draft: CheckoutDraft | null) => void;
  placeDemoOrder: (method: PaymentMethod) => string;
  clearDemoData: () => void;
}

const sampleProduct = demoProducts[0]!;
const sampleVariant = sampleProduct.product_variants[0]!;
const sampleTime = new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString();
const sampleOrder: DemoOrderDetail = {
  order: {
    id: 'demo-order-sample', order_number: 'MT-1042', status: 'in_transit',
    subtotal_cents: sampleVariant.price_cents, shipping_cents: 0,
    total_cents: sampleVariant.price_cents, currency: 'TZS', tracking_ref: 'MTZ-8842',
    created_at: sampleTime, updated_at: sampleTime,
    ship_recipient: 'Amina M.', ship_phone: '+255 712 345 678',
    ship_line1: 'Masaki, Haile Selassie Road', ship_city: 'Dodoma', ship_country: 'TZ',
  },
  items: [{
    id: 'demo-item-sample', order_id: 'demo-order-sample', product_name: sampleProduct.name,
    size_ml: sampleVariant.size_ml, unit_price_cents: sampleVariant.price_cents, quantity: 1,
    image_url: sampleProduct.image_url,
  }],
  events: (['confirmed', 'processing', 'in_transit'] as OrderStatus[]).map((status, index) => ({
    id: index + 1, order_id: 'demo-order-sample', status, note: null,
    created_at: new Date(Date.now() - (2 - index) * 1000 * 60 * 60).toISOString(),
  })),
  paymentMethod: 'mobile',
};

export const useDemoStore = create<DemoState>()(persist((set, get) => ({
  cart: [],
  orders: [sampleOrder],
  addresses: [],
  guestProfile: { fullName: '', email: '', phone: '' },
  preferredPayment: 'mobile',
  reviews: [
    { id: 'preview-review-1', name: 'Neema K.', product: 'Zanzibar Bloom', rating: 5, text: 'Soft, luminous florals that last beautifully through the evening.', date: 'Preview', preview: true },
    { id: 'preview-review-2', name: 'David M.', product: 'Tanzanite Noir', rating: 5, text: 'Warm and distinctive. The dry-down is exceptional.', date: 'Preview', preview: true },
  ],
  checkoutDraft: null,
  addToCart: (variantId, quantity) => {
    const product = demoProducts.find((p) => p.product_variants.some((v) => v.id === variantId));
    const variant = product?.product_variants.find((v) => v.id === variantId);
    if (!product || !variant || variant.stock <= 0) throw new Error('This size is currently unavailable.');
    const current = get().cart.find((line) => line.product_variants.id === variantId);
    if (current) {
      const next = Math.min(10, variant.stock, current.quantity + quantity);
      set((state) => ({ cart: state.cart.map((line) => line.id === current.id ? { ...line, quantity: next } : line) }));
      return;
    }
    set((state) => ({ cart: [...state.cart, {
      id: `demo-line-${variantId}`,
      quantity: Math.min(10, variant.stock, quantity),
      product_variants: { ...variant, products: { id: product.id, name: product.name, image_url: product.image_url } },
    }] }));
  },
  updateCart: (lineId, quantity) => set((state) => ({
    cart: quantity <= 0
      ? state.cart.filter((line) => line.id !== lineId)
      : state.cart.map((line) => line.id === lineId
        ? { ...line, quantity: Math.min(10, line.product_variants.stock, quantity) }
        : line),
  })),
  addAddress: (address) => {
    const entry: Address = { ...address, id: `guest-address-${Date.now()}`, is_default: get().addresses.length === 0 };
    set((state) => ({ addresses: [...state.addresses, entry] }));
    return entry;
  },
  removeAddress: (addressId) => set((state) => ({
    addresses: state.addresses.filter((address) => address.id !== addressId),
  })),
  updateGuestProfile: (profile) => set((state) => ({ guestProfile: { ...state.guestProfile, ...profile } })),
  setPreferredPayment: (preferredPayment) => set({ preferredPayment }),
  addReview: (review) => set((state) => ({ reviews: [{
    ...review, id: `review-${Date.now()}`, date: 'Just now', preview: false,
  }, ...state.reviews] })),
  setCheckoutDraft: (checkoutDraft) => set({ checkoutDraft }),
  placeDemoOrder: (method) => {
    const { cart, checkoutDraft } = get();
    if (!cart.length || !checkoutDraft) throw new Error('Add delivery details before paying.');
    const subtotal = cart.reduce((sum, line) => sum + line.product_variants.price_cents * line.quantity, 0);
    const now = new Date().toISOString();
    const id = `demo-order-${Date.now()}`;
    const shipping = subtotal >= 20000000 ? 0 : 1000000;
    const order: Order = {
      id, order_number: `MT-${String(Date.now()).slice(-6)}`, status: 'confirmed',
      subtotal_cents: subtotal, shipping_cents: shipping, total_cents: subtotal + shipping,
      currency: 'TZS', tracking_ref: `MTZ-${String(Date.now()).slice(-4)}`,
      created_at: now, updated_at: now,
      ship_recipient: checkoutDraft.delivery.recipient, ship_phone: checkoutDraft.delivery.phone,
      ship_line1: checkoutDraft.delivery.line1, ship_city: checkoutDraft.delivery.city, ship_country: 'TZ',
    };
    const events: OrderEvent[] = [{ id: Date.now(), order_id: id, status: 'confirmed', note: 'Demo payment approved', created_at: now }];
    const items: DemoOrderItem[] = cart.map((line, index) => ({
      id: `${id}-item-${index}`, order_id: id, product_name: line.product_variants.products.name,
      size_ml: line.product_variants.size_ml, unit_price_cents: line.product_variants.price_cents,
      quantity: line.quantity,
      image_url: demoProducts.find((product) => product.id === line.product_variants.product_id)?.image_url ?? null,
    }));
    set((state) => ({ orders: [{ order, items, events, paymentMethod: method }, ...state.orders], cart: [], checkoutDraft: null }));
    return id;
  },
  clearDemoData: () => set({ cart: [], orders: [sampleOrder], checkoutDraft: null }),
}), {
  name: 'frerejae.guest-demo.v2',
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({ cart: state.cart }) as DemoState,
}));
