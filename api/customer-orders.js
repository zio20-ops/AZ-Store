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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const serviceToken = await accessToken();
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const account = await verifyAccount(idToken, serviceToken);
    if (!account) return res.status(401).json({ error: 'Sign in to view your orders.' });
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
