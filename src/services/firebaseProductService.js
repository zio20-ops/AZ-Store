import { PRODUCTS } from '../data/products.js';
import { listDocuments, getDocument, putDocument, createDocument, deleteDocument } from './firebaseRest.js';
import { readAdminAuth } from './firebaseRest.js';

const now = () => new Date().toISOString();
const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product';
const admin = () => readAdminAuth()?.isAdmin === true;
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
const fitsFirestoreDocument = (product) => new TextEncoder().encode(JSON.stringify(product)).length <= 800_000;

export const validateProduct = (draft, all = []) => {
  const errors = {};
  if (!draft.name?.trim()) errors.name = 'Product name is required.';
  if (!draft.sku?.trim()) errors.sku = 'SKU is required.';
  else if (all.some((p) => p.id !== draft.id && p.sku === draft.sku.trim())) errors.sku = 'This SKU is already used by another product.';
  if (!draft.category?.trim()) errors.category = 'Category is required.';
  if (!Number.isFinite(Number(draft.price)) || Number(draft.price) <= 0) errors.price = 'Enter a valid price greater than 0.';
  const discount = Number(draft.discount || 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 90) errors.discount = 'Discount must be between 0 and 90.';
  if (draft.compareAtPrice && Number(draft.compareAtPrice) <= Number(draft.price)) errors.compareAtPrice = 'Compare-at price must be higher than the regular price.';
  if (draft.accentHex && !/^#[0-9a-f]{6}$/i.test(draft.accentHex)) errors.accentHex = 'Choose a valid six-digit colour.';
  if (!Number.isInteger(Number(draft.stock)) || Number(draft.stock) < 0) errors.stock = 'Stock must be a whole number of 0 or more.';
  if (!Number.isInteger(Number(draft.lowStockThreshold)) || Number(draft.lowStockThreshold) < 0) errors.lowStockThreshold = 'Threshold must be a whole number of 0 or more.';
  if (!draft.images?.length) errors.images = 'Add at least one product image.';
  (draft.variations || []).forEach((v, i) => {
    if (!v.label?.trim() || !v.sku?.trim() || !Number.isFinite(Number(v.price)) || Number(v.price) <= 0) errors[`variation-${i}`] = 'Each size needs a label, SKU and valid price.';
  });
  return errors;
};

const migrateSeed = () => PRODUCTS.map((p) => {
  const variations = p.variations.map((v) => ({ ...v }));
  return { ...p, slug: p.id, brand: 'AZ', sku: variations[0].sku, price: variations[0].price, compareAtPrice: p.compareAt || null,
    discount: p.compareAt ? Math.round((1 - variations[0].price / p.compareAt) * 100) : 0,
    stock: variations.reduce((n, v) => n + v.stock, 0), lowStockThreshold: 6, status: 'active', images: p.images.map((i) => ({ ...i })),
    volume: '220 ml', weight: '265 g', scentFamily: p.category, scentNotes: [...p.notes], ingredients: [], benefits: [], howToUse: '',
    createdAt: p.createdAt || now(), updatedAt: now() };
});

// Public storefront fallback while Firestore is empty or temporarily unavailable.
// An owner sign-in still writes these records to Firestore via initializeCatalog().
export const getSeedProducts = () => migrateSeed();

export async function initializeCatalog() {
  const current = await listDocuments('products', true);
  const existingProducts = new Set(current.map((product) => product.id));
  // Complete any interrupted/partial first-time migration without replacing
  // products the owner has already customized in Firestore.
  for (const product of migrateSeed()) {
    if (existingProducts.has(product.id)) continue;
    try { await createDocument('products', product.id, product, true); }
    catch (error) { if (error.code !== 409 && error.code !== 'ALREADY_EXISTS') throw error; }
  }

  const currentCategories = await listDocuments('categories', true);
  const existingCategories = new Set(currentCategories.map((category) => category.id));
  for (const name of [...new Set(PRODUCTS.map((product) => product.category))]) {
    const id = slugify(name);
    if (existingCategories.has(id)) continue;
    try { await createDocument('categories', id, { name, image: '' }, true); }
    catch (error) { if (error.code !== 409 && error.code !== 'ALREADY_EXISTS') throw error; }
  }
  // Settings must exist even when products were seeded by an earlier version.
  const settings = await getDocument('settings', 'store', true);
  if (!settings) {
    try { await createDocument('settings', 'store', DEFAULT_SETTINGS, true); }
    catch (error) { if (error.code !== 409 && error.code !== 'ALREADY_EXISTS') throw error; }
  }

  try {
    const currentPromos = await listDocuments('promos', true);
    const existingPromos = new Set(currentPromos.map((promo) => promo.id));
    const starterPromos = [
      { id: 'AZ10', code: 'AZ10', label: '10% off products', type: 'percent', value: 10, appliesTo: 'products', productIds: [], active: true },
      { id: 'FREESHIP', code: 'FREESHIP', label: 'Free delivery', type: 'percent', value: 100, appliesTo: 'shipping', productIds: [], active: true },
    ];
    for (const promo of starterPromos) {
      if (existingPromos.has(promo.id)) continue;
      try { await createDocument('promos', promo.id, promo, true); }
      catch (error) { if (error.code !== 409 && error.code !== 'ALREADY_EXISTS') throw error; }
    }
  } catch (error) {
    // Keep existing admin sign-in usable if Firestore promo rules have not been
    // deployed yet; promo CRUD itself will show the actionable permission error.
    console.warn('Promo setup skipped:', error.message);
  }
}

export const listProducts = async () => {
  try { return await listDocuments('products', admin()); }
  catch (e) { if (!admin()) throw e; return listDocuments('products', false); }
};
export const getProduct = async (id) => getDocument('products', id, admin());

const normalize = (p) => {
  const variations = (p.variations?.length ? p.variations : [{ id: 'default', label: p.volume || 'Standard', price: p.price || 0, stock: p.stock || 0, sku: p.sku || '', image: 0 }]).map((v, i) => ({ ...v, id: v.id || `v${i + 1}`, price: Number(v.price), stock: Number(v.stock) }));
  const createdAt = p.createdAt || now();
  const compareAtPrice = Number(p.compareAtPrice || 0);
  const discount = compareAtPrice > variations[0].price
    ? Math.round((1 - variations[0].price / compareAtPrice) * 100)
    : Number(p.discount || 0);
  return { ...p, variations, price: variations[0].price, sku: variations[0].sku, stock: variations.reduce((n, v) => n + (v.stock || 0), 0), discount, createdAt, releasedAt: p.releasedAt || createdAt.slice(0, 10), updatedAt: now() };
};
export const createProduct = async (draft) => {
  try {
    const all = await listDocuments('products', true);
    let id = slugify(draft.name), n = 2;
    while (all.some((p) => p.id === id)) id = `${slugify(draft.name)}-${n++}`;
    const product = normalize({ ...draft, id, slug: id, status: draft.status || 'active', rating: draft.rating || 0, reviews: draft.reviews || 0, sold: draft.sold || 0, createdAt: now() });
    if (!fitsFirestoreDocument(product)) return { ok: false, message: 'Product images are too large for the database. Remove an image or upload smaller images.' };
    await createDocument('products', id, product, true); return { ok: true, product };
  } catch (e) { return { ok: false, message: e.message }; }
};
export const updateProduct = async (id, patch) => {
  try { const current = await getDocument('products', id, true); if (!current) return { ok: false, message: 'Product not found.' };
    const product = normalize({ ...current, ...patch });
    if (!fitsFirestoreDocument(product)) return { ok: false, message: 'Product images are too large for the database. Remove an image or upload smaller images.' };
    await putDocument('products', id, product, true); return { ok: true, product };
  } catch (e) { return { ok: false, message: e.message }; }
};
export const deleteProduct = async (id) => { try { await deleteDocument('products', id, true); return { ok: true }; } catch (e) { return { ok: false, message: e.message }; } };
export const duplicateProduct = async (id) => { const source = await getProduct(id); if (!source) return { ok: false, message: 'Product not found.' }; return createProduct({ ...source, id: undefined, name: `${source.name} (Copy)`, sku: `${source.sku}-C`, status: 'draft', badge: null, featured: 99, sold: 0, reviews: 0, rating: 0, variations: source.variations.map((v) => ({ ...v, sku: `${v.sku}-C` })) }); };

export const listCategories = async () => (await listDocuments('categories', admin())).map((c) => ({ id: c.id, name: c.name }));
export const saveCategory = async (category) => {
  const name = category.name?.trim(); if (!name) return { ok: false, message: 'Category name is required.' };
  try { const all = await listCategories(); const id = category.id || slugify(name);
    if (all.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) return { ok: false, message: 'A category with this name already exists.' };
    const saved = { name };
    if (category.id) await putDocument('categories', id, saved, true); else await createDocument('categories', id, saved, true);
    return { ok: true, category: { ...saved, id }, created: !category.id };
  } catch (e) { return { ok: false, message: e.message }; }
};
export const deleteCategory = async (id) => { try { const category = await getDocument('categories', id, true); const used = (await listDocuments('products', true)).filter((p) => p.category === category?.name).length;
  if (used) return { ok: false, message: `Move its ${used} product${used > 1 ? 's' : ''} to another category first.` };
  await deleteDocument('categories', id, true); return { ok: true };
} catch (e) { return { ok: false, message: e.message }; } };
export const getSettings = async () => (await getDocument('settings', 'store', admin())) || DEFAULT_SETTINGS;
export const saveSettings = async (patch) => { try {
  // Firestore PATCH is an upsert: it creates the document when it is missing.
  // Settings form submits the complete settings shape, so no preliminary GET
  // is needed (and a missing settings/store document cannot block saving).
  const settings = { ...DEFAULT_SETTINGS, ...patch };
  await putDocument('settings', 'store', settings, true);
  return { ok: true, settings };
} catch (e) { return { ok: false, message: e.message }; } };

export const listPromos = () => listDocuments('promos', admin());
export const savePromo = async (draft) => {
  const code = String(draft.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) return { ok: false, message: 'Use 3–24 letters, numbers, hyphens or underscores for the code.' };
  const value = Number(draft.value);
  if (!Number.isFinite(value) || value < 0 || (draft.type === 'percent' && (value < 1 || value > 100))) return { ok: false, message: 'Enter a valid discount amount. Percentages must be between 1 and 100.' };
  if (!['percent', 'fixed'].includes(draft.type) || !['products', 'shipping'].includes(draft.appliesTo)) return { ok: false, message: 'Choose a valid discount type and target.' };
  if (draft.appliesTo === 'shipping' && draft.productIds?.length) return { ok: false, message: 'Shipping discounts cannot be limited to products.' };
  const promo = { id: code, code, label: String(draft.label || '').trim().slice(0, 80), type: draft.type, value, appliesTo: draft.appliesTo,
    productIds: draft.appliesTo === 'products' ? [...new Set((draft.productIds || []).filter((id) => /^[a-z0-9-]{1,80}$/.test(id)))] : [],
    minSubtotal: Math.max(0, Number(draft.minSubtotal || 0)), active: draft.active !== false, updatedAt: now() };
  try { await putDocument('promos', code, promo, true); return { ok: true, promo }; }
  catch (error) { return { ok: false, message: error.message }; }
};
export const deletePromo = async (code) => {
  try { await deleteDocument('promos', String(code).toUpperCase(), true); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};
