export const PRODUCTS = [
  {
    id: 'through-the-night',
    name: 'Through The Night',
    type: 'mist',
    category: 'Calm and deep',
    accent: 'var(--sky)',
    accentHex: '#8fa6ff',
    badge: null,
    rating: 4.8,
    reviews: 126,
    sold: 840,
    releasedAt: '2025-11-02',
    featured: 2,
    tagline: 'Mysterious and refreshing, with a pull that’s hard to resist.',
    story: 'Depth, freshness and a pull you can’t refuse — for nights that refuse to end.',
    notes: ['Night flowers', 'Fresh fruit', 'Warm woods'],
    description:
      'A cool night air wrapped in bloom. Through The Night opens with dewy fruit and settles into warm woods — mysterious, refreshing, and impossible to forget.',
    images: [
      { src: '/images/product-through-the-night.jpg', alt: 'Through The Night fine fragrance mist, 220 ml bottle on satin' },
      { src: '/images/trio-satin.jpg', alt: 'Through The Night with the AZ trio on bronze satin' },
      { src: '/images/gift-box.jpg', alt: 'Through The Night inside the AZ gift box' },
    ],
    variations: [
      { id: '220', label: '220 ml / 7.4 fl oz', price: 450, stock: 14, sku: 'AZ-TTN-220', image: 0 },
      { id: '100', label: '100 ml / 3.4 fl oz', price: 280, stock: 0, sku: 'AZ-TTN-100', image: 1 },
    ],
  },
  {
    id: 'black-kiss',
    name: 'Black Kiss',
    type: 'mist',
    category: 'Bold',
    accent: 'var(--gold)',
    accentHex: '#e2ad55',
    badge: 'Best seller',
    rating: 4.9,
    reviews: 342,
    sold: 2150,
    releasedAt: '2025-09-14',
    featured: 1,
    tagline: 'Bold and enchanting, with a trace you won’t forget.',
    story: 'Daring, witching, unforgettable — a trace that lingers long after you leave.',
    notes: ['Luxurious flowers', 'Warm vanilla', 'Seductive musk'],
    description:
      'Opulent florals dipped in warm vanilla and a seductive musk trail. Black Kiss is the scent of confidence — bold, enchanting, and made to be remembered.',
    images: [
      { src: '/images/product-black-kiss.jpg', alt: 'Black Kiss fine fragrance mist, 220 ml bottle with gold pump' },
      { src: '/images/trio-marble.jpg', alt: 'Black Kiss with the AZ trio on black marble' },
      { src: '/images/gift-box.jpg', alt: 'Black Kiss inside the AZ gift box' },
    ],
    variations: [
      { id: '220', label: '220 ml / 7.4 fl oz', price: 450, stock: 22, sku: 'AZ-BLK-220', image: 0 },
      { id: '100', label: '100 ml / 3.4 fl oz', price: 280, stock: 6, sku: 'AZ-BLK-100', image: 1 },
    ],
  },
  {
    id: 'million-dreams',
    name: 'Million Dreams',
    type: 'mist',
    category: 'Soft and dreamy',
    accent: 'var(--rose)',
    accentHex: '#ff8fc6',
    badge: null,
    rating: 4.7,
    reviews: 98,
    sold: 610,
    releasedAt: '2026-02-20',
    featured: 3,
    tagline: 'Soft and dreamy, made for your delicate side.',
    story: 'Soft, dreamy, sweet — for your most delicate moments.',
    notes: ['Rose blooms', 'Sweet fruit', 'Soft musk'],
    description:
      'A cloud of rose blooms and sweet fruit over the gentlest musk. Million Dreams is tenderness you can wear — soft, dreamy, and wholly yours.',
    images: [
      { src: '/images/product-million-dreams.jpg', alt: 'Million Dreams fine fragrance mist, 220 ml bottle with rose cloud label' },
      { src: '/images/trio-satin.jpg', alt: 'Million Dreams with the AZ trio on bronze satin' },
      { src: '/images/gift-box.jpg', alt: 'Million Dreams inside the AZ gift box' },
    ],
    variations: [
      { id: '220', label: '220 ml / 7.4 fl oz', price: 450, stock: 11, sku: 'AZ-MLD-220', image: 0 },
      { id: '100', label: '100 ml / 3.4 fl oz', price: 280, stock: 4, sku: 'AZ-MLD-100', image: 1 },
    ],
  },
  {
    id: 'trio-gift-box',
    name: 'Trio Gift Box',
    type: 'gift',
    category: 'All three in one box',
    accent: 'var(--pearl)',
    accentHex: '#f4ead9',
    badge: 'Save 11%',
    compareAt: 1350,
    rating: 4.9,
    reviews: 210,
    sold: 970,
    releasedAt: '2026-05-05',
    featured: 0,
    tagline: 'All three moods in one gift-ready box.',
    story: 'Three scents, one black box, two gift cards — the present that never misses.',
    notes: ['Through The Night', 'Black Kiss', 'Million Dreams'],
    description:
      'The complete AZ wardrobe: Through The Night, Black Kiss and Million Dreams, each 220 ml, nestled in a black velvet-touch box with thank-you and dedication cards. Worth EGP 1,350 separately.',
    images: [
      { src: '/images/gift-box.jpg', alt: 'Open AZ Trio Gift Box with three fragrance mists and gift cards' },
      { src: '/images/trio-marble.jpg', alt: 'The three AZ mists from the Trio Gift Box on black marble' },
      { src: '/images/packaging-box.jpg', alt: 'Closed AZ black packaging box with gold monogram' },
    ],
    variations: [
      { id: '3x220', label: '3 × 220 ml', price: 1200, stock: 9, sku: 'AZ-TRIO-220', image: 0 },
      { id: '3x100', label: '3 × 100 ml', price: 850, stock: 5, sku: 'AZ-TRIO-100', image: 1 },
    ],
  },
];

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id);

export const getVariations = (product) =>
  product.variations && product.variations.length
    ? product.variations
    : [{ id: 'default', label: product.volume || 'Standard', price: product.price, stock: product.stock, sku: product.sku, image: 0 }];

export const getVariation = (product, variationId) =>
  getVariations(product).find((v) => v.id === variationId) || getVariations(product)[0];

export const basePrice = (product) => getVariations(product)[0].price;

export const totalStock = (product) => getVariations(product).reduce((n, v) => n + (v.stock || 0), 0);

export const stockStatus = (stock, threshold = 6) => (stock <= 0 ? 'out' : stock <= threshold ? 'low' : 'in');

export const PROMOS = {
  AZ10: { code: 'AZ10', type: 'percent', value: 10, label: 'Promo AZ10' },
  FREESHIP: { code: 'FREESHIP', type: 'shipping', value: 0, label: 'Promo FREESHIP' },
};

export const FREE_DELIVERY_THRESHOLD = 1800;

export const DELIVERY_METHODS = [
  { id: 'standard', label: 'Standard', eta: '2 to 4 days', price: 60 },
  { id: 'express', label: 'Express', eta: 'Next day', price: 110 },
];

export const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on delivery', note: 'Pay the courier when your order arrives.' },
  { id: 'card', label: 'Visa / Mastercard', note: 'Processed securely by our PCI-compliant partner.' },
  { id: 'vodafone', label: 'Vodafone Cash', note: 'Transfer from your Vodafone Cash wallet.' },
  { id: 'instapay', label: 'InstaPay', note: 'Instant bank transfer through InstaPay.' },
];
