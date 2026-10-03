// Return only the signed-in customer's orders. All order reads stay server-side;
// Firestore's client rules continue to deny direct customer reads.
import { createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let tokenCache;

const b64url = (value) => Buffer.from(value).toString('base64url');
const decode = (value) => {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  return null;
};
const encode = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
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
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Unable to authenticate with Firebase.');
  tokenCache = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return tokenCache.value;
}

async function verifyAccount(idToken, serviceToken) {
  if (!idToken) return null;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  return response.ok ? data.users?.[0] || null : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const serviceToken = await accessToken();
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const account = await verifyAccount(idToken, serviceToken);
    if (!account) return res.status(401).json({ error: 'Sign in to view your orders.' });
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (!origin || new URL(origin).host !== req.headers.host) return res.status(403).json({ error: 'Origin not allowed.' });
      const id = String(req.body?.id || '').trim();
      if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) return res.status(400).json({ error: 'Invalid order number.' });
      const orderResponse = await fetch(`${db}/orders/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${serviceToken}` } });
      if (orderResponse.status === 404) return res.status(404).json({ error: 'Order not found.' });
      const orderDoc = await orderResponse.json().catch(() => ({}));
      if (!orderResponse.ok) throw new Error('Could not read the order from the store database.');
      const order = fields(orderDoc);
      if (order.customerUid !== account.localId) return res.status(404).json({ error: 'Order not found.' });
      if (order.cancelled) return res.status(200).json({ order });
      if (!Number.isInteger(Number(order.status)) || Number(order.status) >= 2) {
        return res.status(409).json({ error: 'This order can no longer be cancelled online because preparation has started. Please contact the store.' });
      }

      const writes = [];
      const quantities = new Map();
      for (const item of order.items || []) {
        if (!item.productId || !item.variationId || !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1) continue;
        const key = `${item.productId}::${item.variationId}`;
        quantities.set(key, (quantities.get(key) || 0) + Number(item.qty));
      }
      const productIds = [...new Set((order.items || []).map((item) => item.productId).filter(Boolean))];
      for (const productId of productIds) {
        if (!/^[a-z0-9-]{1,80}$/.test(productId)) continue;
        const productResponse = await fetch(`${db}/products/${encodeURIComponent(productId)}`, { headers: { Authorization: `Bearer ${serviceToken}` } });
        if (productResponse.status === 404) continue;
        const productDoc = await productResponse.json().catch(() => ({}));
        if (!productResponse.ok) throw new Error('Could not restore product stock for this cancellation.');
        const product = fields(productDoc);
        product.variations = (product.variations || []).map((variation) => {
          const quantity = quantities.get(`${productId}::${variation.id}`) || 0;
          return quantity ? { ...variation, stock: Number(variation.stock || 0) + quantity } : variation;
        });
        product.stock = product.variations.reduce((total, variation) => total + Number(variation.stock || 0), 0);
        writes.push({ update: { name: productDoc.name, fields: Object.fromEntries(Object.entries(product).map(([key, value]) => [key, encode(value)])) }, currentDocument: { updateTime: productDoc.updateTime } });
      }

      order.cancelled = true;
      order.cancelledAt = new Date().toISOString();
      writes.push({ update: { name: orderDoc.name, fields: Object.fromEntries(Object.entries(order).map(([key, value]) => [key, encode(value)])) }, currentDocument: { updateTime: orderDoc.updateTime } });
      const commit = await fetch(`${db}:commit`, {
        method: 'POST', headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes }),
      });
      if (!commit.ok) {
        if (commit.status === 409 || commit.status === 400) return res.status(409).json({ error: 'The order changed while you were cancelling it. Refresh your orders and try again.' });
        throw new Error('Could not save the order cancellation.');
      }
      return res.status(200).json({ order });
    }
    const response = await fetch(`${db}:runQuery`, {
      method: 'POST', headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'orders' }],
        where: { fieldFilter: { field: { fieldPath: 'customerUid' }, op: 'EQUAL', value: { stringValue: account.localId } } },
      } }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Could not load orders from the store database.');
    const orders = (Array.isArray(data) ? data : []).filter((row) => row.document).map((row) => fields(row.document))
      .sort((a, b) => String(b.placedAt || '').localeCompare(String(a.placedAt || '')));
    return res.status(200).json({ orders });
  } catch (error) {
    console.error('customer-orders error:', error.message);
    return res.status(503).json({ error: 'Your orders are temporarily unavailable. Please try again.' });
  }
}
