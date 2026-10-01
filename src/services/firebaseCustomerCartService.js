import { currentIdToken } from './firebaseRest.js';

async function request(method, items) {
  const idToken = await currentIdToken();
  const response = await fetch('/api/customer-cart', {
    method,
    headers: { Authorization: `Bearer ${idToken}`, ...(method === 'PUT' ? { 'Content-Type': 'application/json' } : {}) },
    ...(method === 'PUT' ? { body: JSON.stringify({ items }) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not sync your saved cart.');
  return result;
}

export const loadAccountCart = () => request('GET');
export const saveAccountCart = (items) => request('PUT', items);
