export type NoteTier = 'top' | 'middle' | 'base';

export interface FragranceFamily { id: number; name: string }

export interface ProductNote { id: number; product_id: string; tier: NoteTier; note: string }

export interface Variant {
  id: string; product_id: string; size_ml: number;
  price_cents: number; stock: number; low_stock_threshold: number; sku: string;
}

export interface Product {
  id: string; slug: string; name: string; tagline: string | null; description: string | null;
  family_id: number | null; concentration: string; gender: 'women' | 'men' | 'unisex';
  image_url: string | null; is_active: boolean;
}

export interface ProductDetail extends Product {
  product_notes: ProductNote[];
  product_variants: Variant[];
}

export interface CartLine {
  id: string; quantity: number;
  product_variants: Variant & { products: Pick<Product, 'id' | 'name' | 'image_url'> };
}

export interface Address {
  id: string; label: string; recipient: string; phone: string;
  line1: string; line2: string | null; city: string; region: string | null; country: string;
  is_default: boolean;
}

export interface Order {
  id: string; order_number: string; status: import('./theme').OrderStatus;
  subtotal_cents: number; shipping_cents: number; total_cents: number; currency: string;
  tracking_ref: string | null; created_at: string; updated_at: string;
  ship_recipient?: string; ship_phone?: string; ship_line1?: string; ship_city?: string; ship_country?: string;
}

export interface OrderEvent {
  id: number; order_id: string; status: import('./theme').OrderStatus; note: string | null; created_at: string;
}

export interface OrderItem {
  id: string; order_id: string; product_name: string; size_ml: number;
  unit_price_cents: number; quantity: number;
}
