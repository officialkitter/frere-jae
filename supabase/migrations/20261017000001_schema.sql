-- =====================================================================
-- Frère Jae core schema
-- =====================================================================
create extension if not exists pg_trgm;

-- ---------- Enums ----------
create type public.note_tier as enum ('top', 'middle', 'base');
create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'in_transit', 'delivered', 'cancelled'
);
create type public.app_role as enum ('customer', 'admin');

-- ---------- Profiles (1:1 with auth.users) ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        public.app_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS (security definer avoids recursive policy evaluation)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- Addresses ----------
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  label       text not null default 'Home',
  recipient   text not null,
  phone       text not null,
  line1       text not null,
  line2       text,
  city        text not null,
  region      text,
  country     text not null default 'TZ',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Catalog ----------
create table public.fragrance_families (
  id    smallint generated always as identity primary key,
  name  text not null unique        -- Floral, Woody, Oriental, Fresh, Citrus...
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  tagline      text,
  description  text,
  family_id    smallint references public.fragrance_families(id),
  concentration text not null default 'Eau de Parfum',
  gender       text not null default 'unisex' check (gender in ('women','men','unisex')),
  image_url    text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Scent notes, searchable by tier
create table public.product_notes (
  id          bigint generated always as identity primary key,
  product_id  uuid not null references public.products(id) on delete cascade,
  tier        public.note_tier not null,
  note        text not null,
  unique (product_id, tier, note)
);

-- Sizes / SKUs with their own price and stock
create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  size_ml        smallint not null check (size_ml > 0),
  price_cents    integer  not null check (price_cents >= 0),
  stock          integer  not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5,
  sku            text not null unique,
  unique (product_id, size_ml)
);

-- ---------- Cart (server-side, per user) ----------
create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  variant_id  uuid not null references public.product_variants(id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 10),
  created_at  timestamptz not null default now(),
  unique (user_id, variant_id)
);

-- ---------- Orders ----------
create table public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique default ('MT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id       uuid not null references public.profiles(id) on delete restrict,
  status        public.order_status not null default 'pending',
  subtotal_cents integer not null,
  shipping_cents integer not null default 0,
  total_cents   integer not null,
  currency      text not null default 'TZS',
  ship_recipient text not null,
  ship_phone    text not null,
  ship_line1    text not null,
  ship_city     text not null,
  ship_country  text not null,
  tracking_ref  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  variant_id    uuid not null references public.product_variants(id) on delete restrict,
  product_name  text not null,
  size_ml       smallint not null,
  unit_price_cents integer not null,
  quantity      integer not null check (quantity > 0)
);

-- Timeline for the live tracking dashboard
create table public.order_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      public.order_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- Triggers ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Log an event whenever an order is created or its status changes
create or replace function public.log_order_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') or (new.status is distinct from old.status) then
    insert into public.order_events (order_id, status) values (new.id, new.status);
  end if;
  return new;
end $$;

create trigger trg_orders_event after insert or update of status on public.orders
  for each row execute function public.log_order_event();

-- ---------- Indexes on heavily filtered fields ----------
create index idx_products_active_family  on public.products (family_id) where is_active;
create index idx_products_gender         on public.products (gender)    where is_active;
create index idx_products_name_trgm      on public.products using gin (name gin_trgm_ops);
create index idx_notes_tier_note         on public.product_notes (tier, lower(note));
create index idx_notes_note_trgm         on public.product_notes using gin (note gin_trgm_ops);
create index idx_notes_product           on public.product_notes (product_id);
create index idx_variants_product        on public.product_variants (product_id);
create index idx_variants_price          on public.product_variants (price_cents);
create index idx_cart_user               on public.cart_items (user_id);
create index idx_orders_user_created     on public.orders (user_id, created_at desc);
create index idx_orders_status           on public.orders (status);
create index idx_order_items_order       on public.order_items (order_id);
create index idx_order_events_order      on public.order_events (order_id, created_at);
create index idx_addresses_user          on public.addresses (user_id);
