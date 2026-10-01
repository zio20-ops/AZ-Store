import { PRODUCTS } from '../data/products.js';
import { listDocuments, getDocument, putDocument, createDocument, deleteDocument } from './firebaseRest.js';
import { readAuth } from './firebaseRest.js';

const now = () => new Date().toISOString();
const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'product';
const admin = () => Boolean(readAuth()?.idToken);
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
    createdAt: now(), updatedAt: now() };
});

// Public storefront fallback while Firestore is empty or temporarily unavailable.
// An owner sign-in still writes these records to Firestore via initializeCatalog().
export const getSeedProducts = () => migrateSeed();

export async function initializeCatalog() {
  const current = await listDocuments('products', true);
  if (!current.length) {
    for (const product of migrateSeed()) await createDocument('products', product.id, product, true);
    const cats = [...new Set(PRODUCTS.map((p) => p.category))];
    for (const name of cats) await createDocument('categories', slugify(name), { name, image: '' }, true);
    await createDocument('settings', 'store', DEFAULT_SETTINGS, true);
  }
}

export const listProducts = async () => {
  try { return await listDocuments('products', admin()); }
  catch (e) { if (!admin()) throw e; return listDocuments('products', false); }
};
export const getProduct = async (id) => getDocument('products', id, admin());

const normalize = (p) => {
  const variations = (p.variations?.length ? p.variations : [{ id: 'default', label: p.volume || 'Standard', price: p.price || 0, stock: p.stock || 0, sku: p.sku || '', image: 0 }]).map((v, i) => ({ ...v, id: v.id || `v${i + 1}`, price: Number(v.price), stock: Number(v.stock) }));
  return { ...p, variations, price: variations[0].price, sku: variations[0].sku, stock: variations.reduce((n, v) => n + (v.stock || 0), 0), updatedAt: now() };
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

export const listCategories = async () => (await listDocuments('categories', admin())).map((c) => ({ ...c, image: c.image || '' }));
export const saveCategory = async (category) => {
  const name = category.name?.trim(); if (!name) return { ok: false, message: 'Category name is required.' };
  try { const all = await listCategories(); const id = category.id || slugify(name);
    if (all.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) return { ok: false, message: 'A category with this name already exists.' };
    const saved = { name, image: category.image || '' };
    if (category.id) await putDocument('categories', id, saved, true); else await createDocument('categories', id, saved, true);
    return { ok: true, category: { ...saved, id }, created: !category.id };
  } catch (e) { return { ok: false, message: e.message }; }
};
export const deleteCategory = async (id) => { try { const category = await getDocument('categories', id, true); const used = (await listDocuments('products', true)).filter((p) => p.category === category?.name).length;
  if (used) return { ok: false, message: `Move its ${used} product${used > 1 ? 's' : ''} to another category first.` };
  await deleteDocument('categories', id, true); return { ok: true };
} catch (e) { return { ok: false, message: e.message }; } };
export const getSettings = async () => (await getDocument('settings', 'store', admin())) || DEFAULT_SETTINGS;
export const saveSettings = async (patch) => { try { const exists = await getDocument('settings', 'store', true); const settings = { ...(exists || DEFAULT_SETTINGS), ...patch };
  if (exists) await putDocument('settings', 'store', settings, true); else await createDocument('settings', 'store', settings, true);
  return { ok: true, settings };
} catch (e) { return { ok: false, message: e.message }; } };
