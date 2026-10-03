// Public order tracking lookup. Orders stay private in Firestore (admin-only
// rules); this function verifies the order number + checkout phone pair with
// the service account and returns only the progress fields the tracking
// timeline needs.

import { createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let tokenCache;
const b64url = (v) => Buffer.from(v).toString('base64url');

const dec = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  return null;
};

async function accessToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.value;
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain the service account JSON.'); }
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const data = await response.json();
  if (!response.ok) throw new Error('Unable to authenticate with Firebase.');
  tokenCache = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const id = String(req.query.id || '').trim();
  const phone = String(req.query.phone || '').replace(/[\s-]/g, '');
  if (!id || !/^01[0125]\d{8}$/.test(phone)) return res.status(400).json({ error: 'Enter your order number and the phone used at checkout.' });
  try {
    const token = await accessToken();
    const response = await fetch(`${db}/orders/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return res.status(404).json({ error: 'We couldn’t find that order. Check the number and the phone you checked out with.' });
    const doc = await response.json();
    const order = Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, dec(v)]));
    if (String(order.phone || '').replace(/[\s-]/g, '') !== phone) {
      return res.status(404).json({ error: 'We couldn’t find that order. Check the number and the phone you checked out with.' });
    }
    return res.status(200).json({
      order: {
        id: order.id, name: order.name, total: order.total, placedAt: order.placedAt,
        status: Number(order.status || 0), cancelled: Boolean(order.cancelled),
      },
    });
  } catch (error) {
    console.error('track error:', error.message);
    return res.status(503).json({ error: 'Order tracking is not configured on this deployment.' });
  }
}
