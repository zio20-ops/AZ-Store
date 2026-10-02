// In-browser order backend for dev and static previews. Mirrors the checks the
// Vercel /api/orders function performs in production (enabled payment methods,
// configured transfer destinations, live prices and stock) so behaviour is
// identical across transports.

import { readStorage, writeStorage, makeOrderNumber } from '../utils/format.js';
import { getVariations, productPrice, PROMOS } from '../data/products.js';
import { ensureCatalog, readSettings } from './localStore.js';

const ORDERS_KEY = 'az.orders';

const seedOrders = () => [
  {
    id: 'AZ-2609-1001',
    placedAt: '2026-09-27T10:20:00.000Z',
    status: 3,
    cancelled: false,
    name: 'Demo Customer',
    phone: '01000000000',
    email: '',
    address: '12 Nile Street, Dokki, Giza',
    notes: '',
    payment: 'Cash on delivery',
    paymentMethod: 'cod',
    paymentRef: null,
    paymentStatus: 'Paid',
    deliveryMethod: 'Standard, 2 to 4 days',
    items: [
      { productId: 'black-kiss', variationId: '220', name: 'Black Kiss', meta: '220 ml / 7.4 fl oz', qty: 1, price: 450, image: '/images/product-black-kiss.jpg' },
    ],
    subtotal: 450,
    discount: 0,
    delivery: 60,
    total: 510,
  },
];

const readOrders = () => {
  const existing = readStorage(ORDERS_KEY, null);
  if (existing) return existing;
  writeStorage(ORDERS_KEY, seedOrders());
  return seedOrders();
};

export const listOrders = async () => readOrders();
export const listMyOrders = async () => [];

export const findOrder = async (id, phone) =>
  readOrders().find(
    (o) => o.id.toLowerCase() === String(id).trim().toLowerCase()
      && String(o.phone).replace(/\s/g, '') === String(phone).replace(/\s/g, ''),
  ) || null;

export const trackOrder = async (id, phone) => {
  const order = await findOrder(id, phone);
  if (!order) return { ok: false, message: 'We couldn’t find that order. Check the number and the phone you checked out with.' };
  return { ok: true, order: { id: order.id, name: order.name, total: order.total, placedAt: order.placedAt, status: order.status, cancelled: Boolean(order.cancelled) } };
};

export const createOrder = async (order) => {
  ensureCatalog();
  const settings = readSettings();
  const methods = settings.paymentMethods || {};
  const method = order.paymentMethod || 'cod';
  if (!methods[method]?.enabled) throw new Error('This payment method is not available. Refresh checkout and choose another method.');
  if (method === 'instapay' && !methods.instapay.account) throw new Error('InstaPay is not configured by the store.');
  if (method === 'vodafone' && !methods.vodafone.number) throw new Error('Vodafone Cash is not configured by the store.');
  if (method !== 'cod' && String(order.paymentRef || '').trim().length < 4 && !order.paymentProof) throw new Error('Enter the transfer reference or upload a payment screenshot.');

  const products = readStorage('az.products', []);
  const items = [];
  let subtotal = 0;
  for (const line of order.items) {
    const product = products.find((p) => p.id === line.productId);
    const variation = product ? getVariations(product).find((v) => v.id === line.variationId) : null;
    if (!product || product.status !== 'active' || !variation) throw new Error('A product in your bag is no longer available.');
    if (variation.stock < line.qty) throw new Error(`${product.name} is out of stock for the selected size.`);
    const price = productPrice(product, variation);
    subtotal += price * line.qty;
    items.push({ ...line, price });
  }

  const savedPromos = readStorage('az.promos', Object.values(PROMOS).map((promo) => ({ ...promo, active: true, appliesTo: promo.appliesTo || (promo.type === 'shipping' ? 'shipping' : 'products') })));
  const promo = savedPromos.find((entry) => entry.code === String(order.promoCode || '').trim().toUpperCase() && entry.active !== false);
  const target = promo?.appliesTo || (promo?.type === 'shipping' ? 'shipping' : 'products');
  const eligibleSubtotal = promo?.productIds?.length ? items.filter((item) => promo.productIds.includes(item.productId)).reduce((sum, item) => sum + item.price * item.qty, 0) : subtotal;
  if (target === 'shipping' && (promo.shippingMethod || 'standard') !== 'any' && (promo.shippingMethod || 'standard') !== order.deliveryOption) throw new Error(`This code applies to ${(promo.shippingMethod || 'standard')} delivery only.`);
  if (target === 'shipping' && Number(promo.minSubtotal || 0) > subtotal) throw new Error('This delivery promo does not meet its minimum products total.');
  const discount = target === 'products' && promo
    ? Math.min(eligibleSubtotal, promo.type === 'percent' ? Math.round(eligibleSubtotal * Number(promo.value) / 100) : Number(promo.value || 0))
    : 0;
  const baseDelivery = order.deliveryOption === 'standard' && subtotal >= Number(settings.freeDeliveryThreshold ?? 1800) ? 0 : order.deliveryOption === 'express' ? 110 : 60;
  const shippingDiscount = target === 'shipping' && promo ? Math.min(baseDelivery, promo.type === 'percent' ? Math.round(baseDelivery * Number(promo.value) / 100) : Number(promo.value || 0)) : 0;
  const delivery = baseDelivery - shippingDiscount;

  const saved = {
    ...order,
    paymentProof: undefined,
    items,
    subtotal,
    discount,
    shippingDiscount,
    delivery,
    total: subtotal - discount + delivery,
    id: order.id || makeOrderNumber(),
    placedAt: order.placedAt || new Date().toISOString(),
    status: 0,
    cancelled: false,
    paymentRef: method === 'cod' ? null : String(order.paymentRef || '').trim(),
    paymentProofUrl: method === 'cod' ? null : (order.paymentProof || null),
    paymentStatus: order.paymentStatus || (method === 'cod' ? 'Pending' : 'Verification Required'),
  };

  // Reserve stock exactly like the production order API does.
  const nextProducts = products.map((p) => {
    const lines = items.filter((i) => i.productId === p.id);
    if (!lines.length) return p;
    const variations = getVariations(p).map((v) => {
      const qty = lines.filter((i) => i.variationId === v.id).reduce((n, i) => n + i.qty, 0);
      return qty ? { ...v, stock: Math.max(0, v.stock - qty) } : v;
    });
    return { ...p, variations, stock: variations.reduce((n, v) => n + v.stock, 0) };
  });
  writeStorage('az.products', nextProducts);
  writeStorage(ORDERS_KEY, [saved, ...readOrders()]);
  return saved;
};

export const updateOrder = async (id, patch) => {
  const orders = readOrders();
  const current = orders.find((o) => o.id === id);
  if (!current) throw new Error('Order not found.');
  const next = { ...current, ...patch };
  writeStorage(ORDERS_KEY, orders.map((o) => (o.id === id ? next : o)));
  return next;
};
