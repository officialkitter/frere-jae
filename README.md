# Frère Jae

Single-brand luxury perfume shopping app. React Native (Expo, TypeScript) + Supabase (Postgres, Auth, Realtime).

## Brand system

| Role | Colour |
|---|---|
| Background | White `#FFFFFF` |
| Headers / text | Tanzanite `#002FA7` |
| Primary buttons / active states | Gold `#D4AF37` |
| Success / In stock / Delivered | Emerald `#10B981` |
| Pending / Low stock | Amber `#F59E0B` |
| Out of stock / Cancelled | Crimson `#DC143C` |
| In transit | Pastel blue `#AEC6F6` |

All tokens live in `src/theme.ts`, including the order-status and stock-state mappings.

## Features

- Supabase JWT auth; session stored in the device Keychain/Keystore (`expo-secure-store`) with refresh-token rotation
- Optional biometric unlock (Face ID / fingerprint, device PIN fallback) required on cold start
- Catalog search by name and by **top / heart / base** notes plus fragrance family (`search_fragrances` RPC)
- Product page with scent pyramid, size selector (per-size price and stock), live stock updates
- Server-side cart, checkout through an atomic `place_order` function
- Realtime order tracking timeline driven by `order_events`

## Security model

- RLS enabled on every table; `orders`, `order_items`, `profiles` use FORCE RLS
- Customers can only read their own profile, addresses, cart, orders, items and events
- Clients cannot insert or edit orders. `place_order` (SECURITY DEFINER) reads prices and stock from the database, locks variant rows to prevent overselling, creates the order and clears the cart in one transaction
- Users cannot promote themselves: the profile update policy pins `role`
- Only the public anon key ships in the app; the `service_role` key is never used client-side
- CI fails if any public table lacks RLS

## Indexes

Partial indexes on active products by family and gender; trigram indexes on product name and note text; `(tier, lower(note))` for scent filters; `(user_id, created_at desc)` on orders; plus foreign-key indexes on every child table.

## Local development

```bash
npm install
npx supabase start            # applies migrations and seed.sql
cp .env.example .env          # paste the anon key printed by `supabase start`
npx expo start
```

Biometrics need a device or a simulator with enrolled biometrics. Add `assets/icon.png`, `splash.png`, `adaptive-icon.png` before building.

## Making yourself an admin

```sql
update public.profiles set role = 'admin' where id = '<your-user-uuid>';
```

Admins can update order status (the tracking timeline updates live for customers) and manage the catalog.

## Deployment

1. Create a Supabase project, then add GitHub secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_TOKEN`.
2. Run `eas init` and put the project id in `app.json`; fill the store ids in `eas.json`.
3. Push to `main`: CI runs, then `deploy.yml` pushes migrations and publishes an OTA update. Run the workflow manually with `build_native` to produce and submit store binaries.
4. In the Supabase dashboard: enable email confirmations, set the redirect URL `frerejae://auth-callback`, turn on leaked-password protection, and configure custom SMTP.

## Before launch

- Payments: checkout currently creates an order in `pending` state. Add a payment provider (for example a mobile-money or card gateway) via a Supabase Edge Function that confirms payment and moves the order to `confirmed`.
- Add tests (`jest-expo`) for the formatting helpers and the checkout flow.
- Review prices, shipping thresholds (in `place_order` and `checkout.tsx`) and the TZS currency default.
