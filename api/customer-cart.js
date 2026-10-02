// Each signed-in customer may read and update only the cart keyed by their Firebase UID.
import { createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let tokenCache;

const b64url = (value) => Buffer.from(value).toString('base64url');
const encode = (value) => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
};
const decode = (value) => {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  return null;
};
const fields = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, decode(value)]));

async function accessToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.value;
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); }
  catch { throw new Error('Firebase service account is not configured.'); }
  if (!account.client_email || !account.private_key) throw new Error('Firebase service account is incomplete.');
  const now = Math.floor(Date.now() / 1000);
  const scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit';
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const data = await response.json();
  if (!response.ok) throw new Error('Unable to authenticate with Firebase.');
  tokenCache = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function verifyAccount(idToken, token) {
  if (!idToken) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? data.users?.[0] || null : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const token = await accessToken();
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const account = await verifyAccount(idToken, token);
    if (!account) return res.status(401).json({ error: 'Sign in to your customer account first.' });
    const path = `${db}/customerCarts/${encodeURIComponent(account.localId)}`;

    if (req.method === 'GET') {
      const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 404) return res.status(200).json({ items: [], exists: false });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error('Could not load the saved cart.');
      return res.status(200).json({ items: fields(data).items || [], exists: true });
    }

    const input = req.body?.items;
    if (!Array.isArray(input) || input.length > 100) return res.status(400).json({ error: 'The cart data is invalid.' });
    const items = [];
    for (const item of input) {
      const productId = String(item?.productId || '');
      const variationId = String(item?.variationId || '');
      const qty = Number(item?.qty);
      if (!/^[a-z0-9-]{1,80}$/.test(productId) || !/^[a-zA-Z0-9_-]{1,80}$/.test(variationId) || !Number.isInteger(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: 'The cart contains an invalid product or quantity.' });
      const key = `${productId}__${variationId}`;
      const existing = items.find((line) => line.key === key);
      if (existing) existing.qty = Math.min(20, existing.qty + qty);
      else items.push({ key, productId, variationId, qty });
    }
    const response = await fetch(path, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: Object.fromEntries(Object.entries({ uid: account.localId, items, updatedAt: new Date().toISOString() }).map(([key, value]) => [key, encode(value)])) }),
    });
    if (!response.ok) throw new Error('Could not save the cart to the customer account.');
    return res.status(200).json({ items, exists: true });
  } catch (error) {
    console.error('customer-cart error:', error.message);
    return res.status(503).json({ error: 'Customer cart sync is not available right now.' });
  }
}
