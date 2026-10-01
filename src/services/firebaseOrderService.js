import { listDocuments, getDocument, putDocument } from './firebaseRest.js';

export const listOrders = () => listDocuments('orders', true);
export const createOrder = async (order) => {
  const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    customer: { name: order.name, phone: order.phone, email: order.email, address: order.address, notes: order.notes },
    items: order.items.map((item) => ({ productId: item.productId, variationId: item.variationId, qty: item.qty })),
    deliveryMethod: order.deliveryOption,
    promoCode: order.promoCode || '',
    paymentMethod: order.paymentMethod || 'cod',
    paymentRef: order.paymentRef || '',
    paymentProof: order.paymentProof || '',
  }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not place the order. Please retry.');
  return result.order;
};
export const updateOrder = async (id, patch) => {
  const current = await getDocument('orders', id, true);
  if (!current) throw new Error('Order not found.');
  const next = { ...current, ...patch };
  await putDocument('orders', id, next, true);
  return next;
};
export const trackOrder = async (id, phone) => {
  const response = await fetch(`/api/track?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`, { headers: { Accept: 'application/json' } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: result.error || 'We couldn’t find that order. Check the number and the phone you checked out with.' };
  return { ok: true, order: result.order };
};
