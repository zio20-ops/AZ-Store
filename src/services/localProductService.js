// Mock catalog API for local development.
//
// Every function mirrors a future REST endpoint so this module can be replaced
// by real fetch() calls without touching any page component:
//   GET    /api/products          -> listProducts
//   POST   /api/products          -> createProduct
//   GET    /api/products/:id      -> getProduct
//   PUT    /api/products/:id      -> updateProduct
//   DELETE /api/products/:id      -> deleteProduct
//   PATCH  /api/products/:id/status -> updateProduct(id, { status })
//   GET/POST/PUT/DELETE /api/categories
//   GET/PUT /api/settings
//
// Persistence today: localStorage (single browser). A real backend becomes the
// source of truth for all sessions; the shapes below stay identical.

import { PRODUCTS } from '../data/products.js';
import { readStorage, writeStorage } from '../utils/format.js';

const PRODUCTS_KEY = 'az.products';
const CATEGORIES_KEY = 'az.categories';
const SETTINGS_KEY = 'az.settings';

const delay = (ms = 90) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();

const slugify = (name) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product';

const SEED_DETAILS = {
  'through-the-night': {
    ingredients: ['Alcohol denat.', 'Aqua', 'Parfum', 'Glycerin', 'Benzyl salicylate', 'Linalool'],
    benefits: ['Up to 8 hours of trail', 'Skin-safe, never tested on animals', 'Layer-friendly cool floral'],
    howToUse: 'Spray from 15 cm onto pulse points — wrists, neck, behind ears. Layer over unscented lotion after showering for the longest trail.',
    volume: '220 ml', weight: '265 g',
  },
  'black-kiss': {
    ingredients: ['Alcohol denat.', 'Aqua', 'Parfum', 'Glycerin', 'Coumarin', 'Vanillin'],
    benefits: ['Deep vanilla-musk trail', 'Skin-safe formula', 'The signature AZ confidence scent'],
    howToUse: 'Spray from 15 cm onto pulse points and over clothing. Reapply through the evening to keep the trail alive.',
    volume: '220 ml', weight: '265 g',
  },
  'million-dreams': {
    ingredients: ['Alcohol denat.', 'Aqua', 'Parfum', 'Glycerin', 'Citronellol', 'Geraniol'],
    benefits: ['Soft rose cloud that sits close to skin', 'Skin-safe formula', 'Perfect daytime delicate scent'],
    howToUse: 'Mist over chest and hair from 20 cm for a soft cloud. Reapply through the day as your mood changes.',
    volume: '220 ml', weight: '265 g',
  },
  'trio-gift-box': {
    ingredients: ['Three 220 ml fine fragrance mists', 'Thank-you card', 'Dedication card'],
    benefits: ['Save 11% versus buying separately', 'Gift-ready black velvet-touch box', 'Free dedication card writing'],
    howToUse: 'Gift as is, or keep one and share two. Each mist sprays like the full-size original.',
    volume: '3 × 220 ml', weight: '900 g',
  },
};

const migrateSeed = () => {
  const stamp = '2026-09-01T09:00:00.000Z';
  return PRODUCTS.map((p) => {
    const details = SEED_DETAILS[p.id] || {};
    const variations = p.variations.map((v) => ({ ...v }));
    const price = variations[0].price;
    return {
      ...p,
      slug: p.id,
      brand: 'AZ',
      sku: variations[0].sku,
      price,
      compareAtPrice: p.compareAt || null,
      discount: p.compareAt ? Math.round((1 - price / p.compareAt) * 100) : 0,
      stock: variations.reduce((n, v) => n + v.stock, 0),
      lowStockThreshold: 6,
      status: 'active',
      images: p.images.map((img) => ({ ...img })),
      volume: details.volume || '220 ml',
      weight: details.weight || '265 g',
      scentFamily: p.category,
      scentNotes: [...p.notes],
      ingredients: details.ingredients || [],
      benefits: details.benefits || [],
      howToUse: details.howToUse || '',
      createdAt: stamp,
      updatedAt: stamp,
    };
  });
};

const ensureSeed = () => {
  if (!readStorage(PRODUCTS_KEY, null)) writeStorage(PRODUCTS_KEY, migrateSeed());
  if (!readStorage(CATEGORIES_KEY, null)) {
    const products = readStorage(PRODUCTS_KEY, []);
    const seen = [];
    products.forEach((p) => {
      if (!seen.find((c) => c.name === p.category)) {
        seen.push({ id: slugify(p.category), name: p.category, image: p.images[0]?.src || '' });
      }
    });
    writeStorage(CATEGORIES_KEY, seen);
  }
  if (!readStorage(SETTINGS_KEY, null)) {
    writeStorage(SETTINGS_KEY, {
      announcement: 'Free gift cards with every trio box',
      freeDeliveryThreshold: 1800,
      defaultLowStockThreshold: 6,
      paymentMethods: {
        cod: { enabled: true },
        instapay: { enabled: false, account: '', accountName: '' },
        vodafone: { enabled: false, number: '' },
      },
    });
  }
};

const persist = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const recompute = (p) => {
  const variations = p.variations && p.variations.length ? p.variations : [{ id: 'default', label: p.volume || 'Standard', price: p.price || 0, stock: p.stock || 0, sku: p.sku || '', image: 0 }];
  return {
    ...p,
    variations,
    price: variations[0].price,
    sku: variations[0].sku,
    stock: variations.reduce((n, v) => n + (v.stock || 0), 0),
    discount: p.compareAtPrice ? Math.max(0, Math.round((1 - variations[0].price / p.compareAtPrice) * 100)) : (p.discount || 0),
    updatedAt: now(),
  };
};

export const validateProduct = (draft, all = []) => {
  const errors = {};
  if (!draft.name || !draft.name.trim()) errors.name = 'Product name is required.';
  if (!draft.sku || !draft.sku.trim()) errors.sku = 'SKU is required.';
  else if (all.some((p) => p.id !== draft.id && p.sku === draft.sku.trim())) errors.sku = 'This SKU is already used by another product.';
  if (!draft.category || !draft.category.trim()) errors.category = 'Category is required.';
  const price = Number(draft.price);
  if (!Number.isFinite(price) || price <= 0) errors.price = 'Enter a valid price greater than 0.';
  const stock = Number(draft.stock);
  if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Stock must be a whole number of 0 or more.';
  const threshold = Number(draft.lowStockThreshold);
  if (!Number.isInteger(threshold) || threshold < 0) errors.lowStockThreshold = 'Threshold must be a whole number of 0 or more.';
  const discount = Number(draft.discount || 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 90) errors.discount = 'Discount must be between 0 and 90.';
  if (!draft.images || draft.images.length === 0) errors.images = 'Add at least one product image.';
  (draft.variations || []).forEach((v, i) => {
    if (!v.label || !v.label.trim()) errors[`variation-${i}`] = 'Every size needs a label.';
    else if (!Number.isFinite(Number(v.price)) || Number(v.price) <= 0) errors[`variation-${i}`] = 'Every size needs a valid price.';
    else if (!v.sku || !v.sku.trim()) errors[`variation-${i}`] = 'Every size needs a SKU.';
  });
  return errors;
};

export const listProducts = async () => {
  ensureSeed();
  await delay();
  return readStorage(PRODUCTS_KEY, []);
};

export const getProduct = async (id) => {
  ensureSeed();
  await delay(40);
  return readStorage(PRODUCTS_KEY, []).find((p) => p.id === id) || null;
};

export const createProduct = async (draft) => {
  ensureSeed();
  await delay();
  const all = readStorage(PRODUCTS_KEY, []);
  let id = slugify(draft.name);
  let n = 2;
  while (all.some((p) => p.id === id)) id = `${slugify(draft.name)}-${n++}`;
  const product = recompute({
    ...draft,
    id,
    slug: id,
    variations: (draft.variations || []).map((v, i) => ({
      id: v.id || `v${i + 1}`,
      label: v.label,
      price: Number(v.price),
      stock: Number(v.stock),
      sku: (v.sku || '').trim(),
      image: Number(v.image || 0),
    })),
    rating: draft.rating || 0,
    reviews: draft.reviews || 0,
    sold: draft.sold || 0,
    releasedAt: draft.releasedAt || now().slice(0, 10),
    featured: draft.featured ?? 99,
    createdAt: now(),
  });
  if (!persist(PRODUCTS_KEY, [product, ...all])) return { ok: false, message: 'Unable to save product. Storage is full.' };
  return { ok: true, product };
};

export const updateProduct = async (id, patch) => {
  ensureSeed();
  await delay();
  const all = readStorage(PRODUCTS_KEY, []);
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) return { ok: false, message: 'Product not found.' };
  const merged = recompute({ ...all[index], ...patch });
  const next = [...all];
  next[index] = merged;
  if (!persist(PRODUCTS_KEY, next)) return { ok: false, message: 'Unable to save product. Storage is full.' };
  return { ok: true, product: merged };
};

export const deleteProduct = async (id) => {
  ensureSeed();
  await delay();
  const all = readStorage(PRODUCTS_KEY, []);
  if (!persist(PRODUCTS_KEY, all.filter((p) => p.id !== id))) return { ok: false, message: 'Unable to delete product.' };
  return { ok: true };
};

export const duplicateProduct = async (id) => {
  const source = await getProduct(id);
  if (!source) return { ok: false, message: 'Product not found.' };
  const copy = {
    ...source,
    id: '',
    name: `${source.name} (Copy)`,
    sku: `${source.sku}-C`,
    status: 'draft',
    badge: null,
    featured: 99,
    sold: 0,
    reviews: 0,
    rating: 0,
    variations: source.variations.map((v) => ({ ...v, sku: `${v.sku}-C` })),
  };
  delete copy.id;
  return createProduct(copy);
};

export const listCategories = async () => {
  ensureSeed();
  await delay(40);
  return readStorage(CATEGORIES_KEY, []);
};

export const saveCategory = async (category) => {
  ensureSeed();
  await delay(40);
  const all = readStorage(CATEGORIES_KEY, []);
  const index = all.findIndex((c) => c.id === category.id);
  const entry = { id: category.id || slugify(category.name), name: category.name.trim(), image: category.image || '' };
  if (!entry.name) return { ok: false, message: 'Category name is required.' };
  if (all.some((c) => c.name.toLowerCase() === entry.name.toLowerCase() && c.id !== entry.id)) {
    return { ok: false, message: 'A category with this name already exists.' };
  }
  const next = index === -1 ? [...all, entry] : all.map((c) => (c.id === entry.id ? entry : c));
  if (!persist(CATEGORIES_KEY, next)) return { ok: false, message: 'Unable to save category.' };
  return { ok: true, category: entry, created: index === -1 };
};

export const deleteCategory = async (id) => {
  ensureSeed();
  await delay(40);
  const all = readStorage(CATEGORIES_KEY, []);
  const category = all.find((c) => c.id === id);
  const used = readStorage(PRODUCTS_KEY, []).filter((p) => p.category === category?.name).length;
  if (used > 0) return { ok: false, message: `Move its ${used} product${used > 1 ? 's' : ''} to another category first.` };
  if (!persist(CATEGORIES_KEY, all.filter((c) => c.id !== id))) return { ok: false, message: 'Unable to delete category.' };
  return { ok: true };
};

export const getSettings = async () => {
  ensureSeed();
  await delay(30);
  return readStorage(SETTINGS_KEY, {});
};

export const saveSettings = async (patch) => {
  ensureSeed();
  await delay(60);
  const next = { ...readStorage(SETTINGS_KEY, {}), ...patch };
  if (!persist(SETTINGS_KEY, next)) return { ok: false, message: 'Unable to save settings.' };
  return { ok: true, settings: next };
};

export const listPromos = async () => readStorage('az.promos', [
  { id: 'AZ10', code: 'AZ10', label: '10% off products', type: 'percent', value: 10, appliesTo: 'products', productIds: [], active: true },
  { id: 'FREESHIP', code: 'FREESHIP', label: 'Free delivery', type: 'percent', value: 100, appliesTo: 'shipping', productIds: [], active: true },
]);
export const savePromo = async (draft) => {
  const code = String(draft.code || '').trim().toUpperCase();
  const value = Number(draft.value);
  if (!/^[A-Z0-9_-]{3,24}$/.test(code) || !Number.isFinite(value) || value < 0 || (draft.type === 'percent' && (value < 1 || value > 100))) return { ok: false, message: 'Check the promo code and discount value.' };
  const promo = { ...draft, id: code, code, value, productIds: draft.appliesTo === 'products' ? (draft.productIds || []) : [], active: draft.active !== false };
  const all = await listPromos();
  if (!persist('az.promos', [...all.filter((item) => item.code !== code), promo])) return { ok: false, message: 'Unable to save promo.' };
  return { ok: true, promo };
};
export const deletePromo = async (code) => {
  const all = await listPromos();
  return persist('az.promos', all.filter((item) => item.code !== String(code).toUpperCase())) ? { ok: true } : { ok: false, message: 'Unable to remove promo.' };
};

export const DEFAULT_SETTINGS = {
  announcement: 'Free gift cards with every trio box',
  freeDeliveryThreshold: 1800,
  defaultLowStockThreshold: 6,
  paymentMethods: {
    cod: { enabled: true },
    instapay: { enabled: false, account: '', accountName: '' },
    vodafone: { enabled: false, number: '' },
  },
};

export const initializeCatalog = async () => {
  ensureSeed();
};
