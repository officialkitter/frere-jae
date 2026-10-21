import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { demoFamilies, demoNoteOptions, demoProducts } from '@/lib/demo-data';
import { isBackendConfigured, supabase } from '@/lib/supabase';
import { useDemoStore, type CheckoutDraft, type DemoOrderDetail, type PaymentMethod } from '@/store/demo';
import type {
  Address, CartLine, FragranceFamily, Order, OrderEvent, OrderItem, Product, ProductDetail,
} from '@/types';

export type { FragranceFamily };

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------------- Catalog ----------------
export interface CatalogFilters {
  query: string; top: string[]; middle: string[]; base: string[]; family: number | null;
}

export function useFamilies() {
  return useQuery({
    queryKey: ['families'],
    queryFn: async () => isBackendConfigured
      ? unwrap(await supabase.from('fragrance_families').select('id,name').order('name')) as FragranceFamily[]
      : demoFamilies,
    staleTime: 1000 * 60 * 30,
  });
}

export function useNoteOptions() {
  return useQuery({
    queryKey: ['note-options'],
    queryFn: async () => {
      if (!isBackendConfigured) return demoNoteOptions;
      const rows = unwrap(await supabase.from('product_notes').select('tier,note')) as { tier: 'top' | 'middle' | 'base'; note: string }[];
      const out: Record<'top' | 'middle' | 'base', string[]> = { top: [], middle: [], base: [] };
      for (const r of rows) if (!out[r.tier].includes(r.note)) out[r.tier].push(r.note);
      (Object.keys(out) as (keyof typeof out)[]).forEach((k) => out[k].sort());
      return out;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useCatalog(f: CatalogFilters) {
  return useQuery({
    queryKey: ['catalog', f],
    queryFn: async () => {
      if (!isBackendConfigured) {
        const query = f.query.toLowerCase();
        return demoProducts.filter((product) => {
          const notes = product.product_notes;
          const matchesQuery = !query || `${product.name} ${product.tagline} ${notes.map((n) => n.note).join(' ')}`.toLowerCase().includes(query);
          const matchesFamily = f.family === null || product.family_id === f.family;
          const matchesNotes = (['top', 'middle', 'base'] as const).every((tier) =>
            !f[tier].length || f[tier].some((note) => notes.some((n) => n.tier === tier && n.note === note)));
          return matchesQuery && matchesFamily && matchesNotes;
        }).map((product) => ({
          ...product,
          min_price: Math.min(...product.product_variants.map((variant) => variant.price_cents)),
          sold_out: product.product_variants.every((variant) => variant.stock <= 0),
        }));
      }
      const found = unwrap(await supabase.rpc('search_fragrances', {
        p_query: f.query || null,
        p_top: f.top.length ? f.top : null,
        p_middle: f.middle.length ? f.middle : null,
        p_base: f.base.length ? f.base : null,
        p_family: f.family,
      })) as Product[];
      if (!found.length) return [] as (Product & { min_price: number | null; sold_out: boolean })[];
      const variants = unwrap(await supabase
        .from('product_variants').select('product_id,price_cents,stock')
        .in('product_id', found.map((p) => p.id))) as { product_id: string; price_cents: number; stock: number }[];
      return found.map((p) => {
        const vs = variants.filter((v) => v.product_id === p.id);
        return {
          ...p,
          min_price: vs.length ? Math.min(...vs.map((v) => v.price_cents)) : null,
          sold_out: vs.length > 0 && vs.every((v) => v.stock <= 0),
        };
      });
    },
  });
}

export function useProduct(slug: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => isBackendConfigured
      ? unwrap(await supabase.from('products').select('*, product_notes(*), product_variants(*)').eq('slug', slug).single()) as ProductDetail
      : demoProducts.find((product) => product.slug === slug) ?? Promise.reject(new Error('Fragrance not found')),
  });

  // Live stock updates
  useEffect(() => {
    const productId = q.data?.id;
    if (!isBackendConfigured) return;
    if (!productId) return;
    const ch = supabase.channel(`stock:${productId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'product_variants', filter: `product_id=eq.${productId}` },
        () => qc.invalidateQueries({ queryKey: ['product', slug] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [q.data?.id, slug, qc]);

  return q;
}

// ---------------- Cart ----------------
export function useCart(userId: string | undefined) {
  const demoMode = !userId || !isBackendConfigured;
  const qc = useQueryClient();
  const queryKey = ['cart', demoMode ? 'guest' : userId];
  useEffect(() => {
    if (!demoMode) return;
    return useDemoStore.subscribe((state) => qc.setQueryData(queryKey, state.cart));
  }, [demoMode, qc, userId]);
  return useQuery({
    queryKey,
    enabled: true,
    queryFn: async () => demoMode ? useDemoStore.getState().cart : unwrap(await supabase
      .from('cart_items')
      .select('id, quantity, product_variants(*, products(id,name,image_url))')
      .order('created_at')) as unknown as CartLine[],
  });
}

export function useAddToCart(userId: string | undefined) {
  const qc = useQueryClient();
  const demoMode = !userId || !isBackendConfigured;
  return useMutation({
    mutationFn: async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
      if (demoMode) {
        useDemoStore.getState().addToCart(variantId, quantity);
        return;
      }
      const existing = await supabase.from('cart_items').select('id,quantity')
        .eq('variant_id', variantId).maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data) {
        const next = Math.min(10, existing.data.quantity + quantity);
        unwrap(await supabase.from('cart_items').update({ quantity: next }).eq('id', existing.data.id).select());
      } else {
        unwrap(await supabase.from('cart_items')
          .insert({ user_id: userId!, variant_id: variantId, quantity }).select());
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', demoMode ? 'guest' : userId] }),
  });
}

export function useUpdateCart(userId: string | undefined) {
  const qc = useQueryClient();
  const demoMode = !userId || !isBackendConfigured;
  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (demoMode) {
        useDemoStore.getState().updateCart(id, quantity);
        return;
      }
      if (quantity <= 0) unwrap(await supabase.from('cart_items').delete().eq('id', id).select());
      else unwrap(await supabase.from('cart_items').update({ quantity: Math.min(10, quantity) }).eq('id', id).select());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart', demoMode ? 'guest' : userId] }),
  });
}

// ---------------- Addresses & checkout ----------------
export function useAddresses(userId: string | undefined) {
  const demoMode = !userId || !isBackendConfigured;
  const qc = useQueryClient();
  const queryKey = ['addresses', demoMode ? 'guest' : userId];
  useEffect(() => {
    if (!demoMode) return;
    return useDemoStore.subscribe((state) => qc.setQueryData(queryKey, state.addresses));
  }, [demoMode, qc, userId]);
  return useQuery({
    queryKey,
    enabled: true,
    queryFn: async () => demoMode ? useDemoStore.getState().addresses : unwrap(await supabase.from('addresses').select('*')
      .order('is_default', { ascending: false })) as Address[],
  });
}

export function useSaveAddress(userId: string | undefined) {
  const qc = useQueryClient();
  const demoMode = !userId || !isBackendConfigured;
  return useMutation({
    mutationFn: async (a: Omit<Address, 'id' | 'is_default'>) => {
      if (demoMode) return useDemoStore.getState().addAddress(a);
      return unwrap(await supabase.from('addresses').insert({ ...a, user_id: userId!, is_default: true }).select().single()) as Address;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses', demoMode ? 'guest' : userId] }),
  });
}

export function useDeleteAddress(userId: string | undefined) {
  const qc = useQueryClient();
  const demoMode = !userId || !isBackendConfigured;
  return useMutation({
    mutationFn: async (addressId: string) => {
      if (demoMode) useDemoStore.getState().removeAddress(addressId);
      else unwrap(await supabase.from('addresses').delete().eq('id', addressId).select());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['addresses', demoMode ? 'guest' : userId] }),
  });
}

export function usePlaceOrder(userId: string | undefined) {
  const qc = useQueryClient();
  const demoMode = !userId || !isBackendConfigured;
  return useMutation({
    mutationFn: async ({ addressId, delivery, paymentMethod }: CheckoutDraft & { paymentMethod: PaymentMethod }) => {
      if (demoMode) {
        useDemoStore.getState().setCheckoutDraft({ addressId, delivery });
        return useDemoStore.getState().placeDemoOrder(paymentMethod);
      }
      if (!addressId) throw new Error('Choose a saved delivery address.');
      return unwrap(await supabase.rpc('place_order', { p_address_id: addressId })) as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart', demoMode ? 'guest' : userId] });
      qc.invalidateQueries({ queryKey: ['orders', demoMode ? 'guest' : userId] });
    },
  });
}

// ---------------- Orders (realtime) ----------------
export function useOrders(userId: string | undefined) {
  const qc = useQueryClient();
  const demoMode = !userId || !isBackendConfigured;
  const queryKey = ['orders', demoMode ? 'guest' : userId];
  useEffect(() => {
    if (!demoMode) return;
    return useDemoStore.subscribe((state) => qc.setQueryData(queryKey, state.orders.map((detail) => detail.order)));
  }, [demoMode, qc, userId]);
  const q = useQuery({
    queryKey,
    enabled: true,
    queryFn: async () => demoMode
      ? useDemoStore.getState().orders.map((detail) => detail.order)
      : (unwrap(await supabase.from('orders')
        .select('*, order_items(product_variants(products(image_url)))')
        .order('created_at', { ascending: false })) as (Order & {
          order_items?: { product_variants?: { products?: { image_url: string | null } | null } | null }[];
        })[]).map(({ order_items, ...order }) => ({
          ...order, image_url: order_items?.[0]?.product_variants?.products?.image_url ?? null,
        })),
  });

  useEffect(() => {
    if (demoMode || !userId) return;
    const ch = supabase.channel(`orders:${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ['orders', userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc, demoMode]);

  return q;
}

export function useOrderDetail(orderId: string) {
  const qc = useQueryClient();
  const demoMode = !isBackendConfigured || orderId.startsWith('demo-order-');
  const q = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (demoMode) {
        const detail = useDemoStore.getState().orders.find((item) => item.order.id === orderId);
        if (!detail) throw new Error('Order not found on this device.');
        return detail as DemoOrderDetail;
      }
      const [order, items, events] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_items').select('*, product_variants(products(image_url))').eq('order_id', orderId),
        supabase.from('order_events').select('*').eq('order_id', orderId).order('created_at'),
      ]);
      const orderItems = unwrap(items) as (OrderItem & {
        product_variants?: { products?: { image_url: string | null } | null } | null;
      })[];
      return {
        order: unwrap(order) as Order,
        items: orderItems.map(({ product_variants, ...item }) => ({
          ...item, image_url: product_variants?.products?.image_url ?? null,
        })),
        events: unwrap(events) as OrderEvent[],
      };
    },
  });

  useEffect(() => {
    if (demoMode) return;
    const ch = supabase.channel(`order:${orderId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_events', filter: `order_id=eq.${orderId}` },
        () => qc.invalidateQueries({ queryKey: ['order', orderId] }))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        () => qc.invalidateQueries({ queryKey: ['order', orderId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, qc, demoMode]);

  return q;
}
