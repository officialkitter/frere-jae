-- Seed data for local development (supabase db reset)
insert into public.fragrance_families (name) values
  ('Floral'), ('Woody'), ('Oriental'), ('Fresh'), ('Citrus'), ('Gourmand');

with f as (select id, name from public.fragrance_families),
p as (
  insert into public.products (slug, name, tagline, description, family_id, concentration, gender, image_url) values
  ('tanzanite-noir', 'Tanzanite Noir', 'Dusk over Kilimanjaro',
   'A deep, velvety oriental with violet leaf and smoked oud, finished in warm amber.',
   (select id from f where name='Oriental'), 'Extrait de Parfum', 'unisex',
   'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800'),
  ('zanzibar-bloom', 'Zanzibar Bloom', 'Jasmine in the spice winds',
   'Sun-warmed jasmine and ylang-ylang over clove bud and creamy sandalwood.',
   (select id from f where name='Floral'), 'Eau de Parfum', 'women',
   'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800'),
  ('serengeti-gold', 'Serengeti Gold', 'The first light on the plains',
   'Bright bergamot and grapefruit open to cedar and vetiver, anchored by golden amber.',
   (select id from f where name='Woody'), 'Eau de Parfum', 'men',
   'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800'),
  ('indigo-mist', 'Indigo Mist', 'Sea air at the Indian Ocean',
   'Salted citrus, marine accord and white musk — clean and luminous.',
   (select id from f where name='Fresh'), 'Eau de Toilette', 'unisex',
   'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800')
  returning id, slug
)
insert into public.product_notes (product_id, tier, note)
select p.id, n.tier::public.note_tier, n.note from p join (values
  ('tanzanite-noir','top','Violet Leaf'),('tanzanite-noir','top','Black Pepper'),
  ('tanzanite-noir','middle','Smoked Oud'),('tanzanite-noir','middle','Rose'),
  ('tanzanite-noir','base','Amber'),('tanzanite-noir','base','Vanilla'),
  ('zanzibar-bloom','top','Mandarin'),('zanzibar-bloom','top','Pink Pepper'),
  ('zanzibar-bloom','middle','Jasmine'),('zanzibar-bloom','middle','Ylang-Ylang'),
  ('zanzibar-bloom','base','Sandalwood'),('zanzibar-bloom','base','Clove'),
  ('serengeti-gold','top','Bergamot'),('serengeti-gold','top','Grapefruit'),
  ('serengeti-gold','middle','Cedar'),('serengeti-gold','middle','Geranium'),
  ('serengeti-gold','base','Vetiver'),('serengeti-gold','base','Amber'),
  ('indigo-mist','top','Lemon'),('indigo-mist','top','Sea Salt'),
  ('indigo-mist','middle','Marine Accord'),('indigo-mist','middle','Neroli'),
  ('indigo-mist','base','White Musk'),('indigo-mist','base','Driftwood')
) as n(slug, tier, note) on n.slug = p.slug;

-- Prices stored in minor units (cents) of TZS
insert into public.product_variants (product_id, size_ml, price_cents, stock, sku)
select id, s.size_ml, s.price_cents, s.stock, upper(replace(slug,'-','')) || '-' || s.size_ml
from public.products
cross join lateral (values (30, 18000000, 25), (50, 28000000, 12), (100, 45000000, 3)) as s(size_ml, price_cents, stock)
where slug in ('tanzanite-noir','zanzibar-bloom','serengeti-gold','indigo-mist');

-- Show all three stock states in dev: one sold out, one low
update public.product_variants set stock = 0 where sku = 'INDIGOMIST-100';
