import type { FragranceFamily, ProductDetail, ProductNote, Variant } from '@/types';

const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=85`;

export const demoFamilies: FragranceFamily[] = [
  { id: 1, name: 'Floral' }, { id: 2, name: 'Woody' }, { id: 3, name: 'Oriental' },
  { id: 4, name: 'Fresh' }, { id: 5, name: 'Citrus' }, { id: 6, name: 'Gourmand' },
];

const sources = [
  ['tanzanite-noir', 'Tanzanite Noir', 'Dusk over Kilimanjaro', 'A velvety oriental with violet leaf and smoked oud, finished in warm amber.', 3, 'Extrait de Parfum', 'unisex', 'photo-1497250681960-ef046c08a56e', ['Violet Leaf', 'Black Pepper', 'Smoked Oud', 'Rose', 'Amber', 'Vanilla']],
  ['zanzibar-bloom', 'Zanzibar Bloom', 'Jasmine in the spice winds', 'Sun-warmed jasmine and ylang-ylang over clove bud and creamy sandalwood.', 1, 'Eau de Parfum', 'women', 'photo-1490750967868-88aa4486c946', ['Mandarin', 'Pink Pepper', 'Jasmine', 'Ylang-Ylang', 'Sandalwood', 'Clove']],
  ['serengeti-gold', 'Serengeti Gold', 'The first light on the plains', 'Bright bergamot and grapefruit open to cedar and vetiver, anchored by golden amber.', 2, 'Eau de Parfum', 'men', 'photo-1501004318641-b39e6451bec6', ['Bergamot', 'Grapefruit', 'Cedar', 'Geranium', 'Vetiver', 'Amber']],
  ['indigo-mist', 'Indigo Mist', 'Sea air on the Indian Ocean', 'Salted citrus, marine accord and white musk: clean, luminous, unforgettable.', 4, 'Eau de Toilette', 'unisex', 'photo-1592945403244-b3fbafd7f539', ['Lemon', 'Sea Salt', 'Marine Accord', 'Neroli', 'White Musk', 'Driftwood']],
  ['spice-island', 'Spice Island', 'A golden hour in Stone Town', 'Cardamom and cinnamon drift into soft amber, worn close to the skin.', 3, 'Eau de Parfum', 'unisex', 'photo-1497250681960-ef046c08a56e', ['Cardamom', 'Bergamot', 'Cinnamon', 'Rose', 'Tonka', 'Amber']],
  ['wild-fig', 'Wild Fig', 'Green shade, warm earth', 'Lush fig leaf and neroli meet a quiet, creamy trail of sandalwood.', 6, 'Eau de Parfum', 'women', 'photo-1501004318641-b39e6451bec6', ['Fig Leaf', 'Neroli', 'Violet', 'Coconut Milk', 'Sandalwood', 'Musk']],
] as const;

export const demoProducts: ProductDetail[] = sources.map((row, index) => {
  const [slug, name, tagline, description, family_id, concentration, gender, imageId, noteNames] = row;
  const productId = `demo-product-${index + 1}`;
  const notes: ProductNote[] = noteNames.map((note, noteIndex) => ({
    id: index * 10 + noteIndex + 1,
    product_id: productId,
    tier: (['top', 'top', 'middle', 'middle', 'base', 'base'] as const)[noteIndex]!,
    note,
  }));
  const variants: Variant[] = [30, 50, 100].map((size_ml, variantIndex) => {
    const regularStock = variantIndex === 2 ? 3 : 16 + index;
    const stock = slug === 'indigo-mist' && size_ml === 100 ? 0 : regularStock;
    return {
      id: `demo-variant-${slug}-${size_ml}`,
      product_id: productId,
      size_ml,
      price_cents: [18000000, 28000000, 45000000][variantIndex]!,
      stock,
      low_stock_threshold: 5,
      sku: `${slug.toUpperCase()}-${size_ml}`,
    };
  });
  return {
    id: productId, slug, name, tagline, description, family_id, concentration, gender,
    image_url: image(imageId), is_active: true, product_notes: notes, product_variants: variants,
  };
});

function notesFor(tier: ProductNote['tier']) {
  return [...new Set(demoProducts.flatMap((product) => product.product_notes
    .filter((note) => note.tier === tier).map((note) => note.note)))].sort((a, b) => a.localeCompare(b));
}

export const demoNoteOptions = {
  top: notesFor('top'),
  middle: notesFor('middle'),
  base: notesFor('base'),
};

export function demoProductImage(slug: string) {
  return demoProducts.find((product) => product.slug === slug)?.image_url ?? demoProducts[0]!.image_url;
}
