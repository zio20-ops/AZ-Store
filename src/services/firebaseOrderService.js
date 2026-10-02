import { listDocuments, getDocument, putDocument, deleteDocument, currentCustomerIdToken } from './firebaseRest.js';
import * as auth from './authService.js';

export const listOrders = () => listDocuments('orders', true);
export const listMyOrders = async () => {
  const idToken = await currentCustomerIdToken();
  const response = await fetch('/api/customer-orders', { headers: { Authorization: `Bearer ${idToken}`, Accept: 'application/json' } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load your orders. Please try again.');
  return result.orders || [];
};
export const cancelMyOrder = async (id) => {
  const idToken = await currentCustomerIdToken();
  const response = await fetch('/api/customer-orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`, Accept: 'application/json' },
    body: JSON.stringify({ id }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not cancel this order. Please refresh and try again.');
  return result.order;
};
export const createOrder = async (order) => {
  const user = auth.getCurrentUser();
  if (!user || user.isAdmin) throw new Error('Sign in or create a customer account before placing an order.');
  const idToken = await currentCustomerIdToken();
  const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify({
    customer: { name: order.name, phone: order.phone, email: order.email, address: order.address, notes: order.notes },
    items: order.items.map((item) => ({ productId: item.productId, variationId: item.variationId, qty: item.qty })),
    deliveryMethod: order.deliveryOption,
    promoCode: order.promoCode || '',
    paymentMethod: order.paymentMethod || 'cod',
    paymentRef: order.paymentRef || '',
    paymentProof: order.paymentProof || '',
  }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Could not place the order. Please retry.');
    error.code = result.code || '';
    throw error;
  }
  return result.order;
};
export const updateOrder = async (id, patch) => {
  const current = await getDocument('orders', id, true);
  if (!current) throw new Error('Order not found.');
  const next = { ...current, ...patch };
  await putDocument('orders', id, next, true);
  return next;
};
export const deleteOrder = (id) => deleteDocument('orders', id, true);
export const trackOrder = async (id, phone) => {
  const response = await fetch(`/api/track?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`, { headers: { Accept: 'application/json' } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: result.error || 'We couldn’t find that order. Check the number and the phone you checked out with.' };
  return { ok: true, order: result.order };
};
