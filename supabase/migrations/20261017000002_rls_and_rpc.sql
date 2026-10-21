-- =====================================================================
-- Row Level Security
-- Principle: deny by default, grant the minimum per role.
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.addresses           enable row level security;
alter table public.fragrance_families  enable row level security;
alter table public.products            enable row level security;
alter table public.product_notes       enable row level security;
alter table public.product_variants    enable row level security;
alter table public.cart_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_events        enable row level security;

-- Force RLS even for table owners (defense in depth)
alter table public.orders      force row level security;
alter table public.order_items force row level security;
alter table public.profiles    force row level security;

-- ---------- profiles ----------
create policy "profiles: read own"   on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and role = (select p.role from public.profiles p where p.id = (select auth.uid())) -- cannot self-promote
  );

-- ---------- addresses ----------
create policy "addresses: owner all" on public.addresses for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- public catalog (read-only for everyone) ----------
create policy "families: public read" on public.fragrance_families for select to anon, authenticated using (true);
create policy "products: public read active" on public.products for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "notes: public read" on public.product_notes for select to anon, authenticated using (true);
create policy "variants: public read" on public.product_variants for select to anon, authenticated using (true);

-- Admin catalog management
create policy "products: admin write" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "notes: admin write" on public.product_notes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "variants: admin write" on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "families: admin write" on public.fragrance_families for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- cart ----------
create policy "cart: owner all" on public.cart_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- orders (customers read only; writes go through place_order RPC) ----------
create policy "orders: read own" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "orders: admin update" on public.orders for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "order_items: read own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id
                   and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

create policy "order_events: read own" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_id
                   and (o.user_id = (select auth.uid()) or (select public.is_admin()))));

-- No INSERT/DELETE policies on orders, order_items, order_events for clients:
-- inserts happen only inside the SECURITY DEFINER function below.

-- =====================================================================
-- Checkout RPC: atomic, server-priced, stock-checked
-- =====================================================================
create or replace function public.place_order(p_address_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_addr     public.addresses%rowtype;
  v_order_id uuid;
  v_subtotal integer := 0;
  v_shipping integer := 0;
  r          record;
begin
  if v_user is null then raise exception 'Not authenticated' using errcode = '28000'; end if;

  select * into v_addr from public.addresses where id = p_address_id and user_id = v_user;
  if not found then raise exception 'Address not found'; end if;

  if not exists (select 1 from public.cart_items where user_id = v_user) then
    raise exception 'Cart is empty';
  end if;

  -- Lock variants to prevent overselling
  for r in
    select ci.quantity, v.id as variant_id, v.price_cents, v.stock, v.size_ml, p.name
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.user_id = v_user and p.is_active
    for update of v
  loop
    if r.stock < r.quantity then
      raise exception 'Insufficient stock for % (% ml)', r.name, r.size_ml;
    end if;
    v_subtotal := v_subtotal + r.price_cents * r.quantity;
  end loop;

  if v_subtotal = 0 then raise exception 'Cart has no purchasable items'; end if;
  v_shipping := case when v_subtotal >= 20000000 then 0 else 1000000 end; -- cents of TZS

  insert into public.orders (user_id, subtotal_cents, shipping_cents, total_cents,
                             ship_recipient, ship_phone, ship_line1, ship_city, ship_country)
  values (v_user, v_subtotal, v_shipping, v_subtotal + v_shipping,
          v_addr.recipient, v_addr.phone, v_addr.line1, v_addr.city, v_addr.country)
  returning id into v_order_id;

  insert into public.order_items (order_id, variant_id, product_name, size_ml, unit_price_cents, quantity)
  select v_order_id, v.id, p.name, v.size_ml, v.price_cents, ci.quantity
  from public.cart_items ci
  join public.product_variants v on v.id = ci.variant_id
  join public.products p on p.id = v.product_id
  where ci.user_id = v_user;

  update public.product_variants v
     set stock = v.stock - ci.quantity
    from public.cart_items ci
   where ci.variant_id = v.id and ci.user_id = v_user;

  delete from public.cart_items where user_id = v_user;
  return v_order_id;
end $$;

revoke all on function public.place_order(uuid) from public, anon;
grant execute on function public.place_order(uuid) to authenticated;

-- =====================================================================
-- Scent-profile search RPC (top / middle / base notes)
-- =====================================================================
create or replace function public.search_fragrances(
  p_query  text default null,
  p_top    text[] default null,
  p_middle text[] default null,
  p_base   text[] default null,
  p_family smallint default null,
  p_limit  int default 30,
  p_offset int default 0
)
returns setof public.products
language sql stable
as $$
  select p.* from public.products p
  where p.is_active
    and (p_family is null or p.family_id = p_family)
    and (p_query is null or p_query = '' or p.name ilike '%' || p_query || '%'
         or exists (select 1 from public.product_notes n
                    where n.product_id = p.id and n.note ilike '%' || p_query || '%'))
    and (p_top    is null or exists (select 1 from public.product_notes n where n.product_id = p.id and n.tier = 'top'    and lower(n.note) = any (select lower(x) from unnest(p_top) x)))
    and (p_middle is null or exists (select 1 from public.product_notes n where n.product_id = p.id and n.tier = 'middle' and lower(n.note) = any (select lower(x) from unnest(p_middle) x)))
    and (p_base   is null or exists (select 1 from public.product_notes n where n.product_id = p.id and n.tier = 'base'   and lower(n.note) = any (select lower(x) from unnest(p_base) x)))
  order by p.created_at desc
  limit least(p_limit, 100) offset greatest(p_offset, 0);
$$;
grant execute on function public.search_fragrances to anon, authenticated;

-- =====================================================================
-- Realtime: publish only what the tracking dashboard needs (RLS still applies)
-- =====================================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_events;
alter publication supabase_realtime add table public.product_variants;
