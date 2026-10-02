// Record customer sign-ins with Firebase-verified identity and list them for admins.
import { createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const ownerEmail = (process.env.ADMIN_EMAIL || 'ziadabdo43320@gmail.com').toLowerCase();
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let tokenCache;

const b64url = (value) => Buffer.from(value).toString('base64url');
const encode = (value) => {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, encode(item)])) } };
};
const decode = (value) => {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
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
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
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
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data.users?.[0] || null;
}

async function isAdmin(account, token) {
  if (!account || account.emailVerified !== true) return false;
  if ((account.email || '').toLowerCase() === ownerEmail) return true;
  const response = await fetch(`${db}/admins/${encodeURIComponent(account.localId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return false;
  return ['owner', 'admin'].includes(fields(await response.json()).role);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const token = await accessToken();
    const idToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const account = await verifyAccount(idToken, token);
    if (!account) return res.status(401).json({ error: 'Sign in to your account first.' });

    if (req.method === 'POST') {
      if ((account.email || '').toLowerCase() === ownerEmail) return res.status(200).json({ ok: true, skipped: true });
      const activity = {
        uid: account.localId,
        email: (account.email || '').toLowerCase(),
        name: account.displayName || '',
        provider: account.providerUserInfo?.[0]?.providerId || 'password',
        lastLoginAt: new Date().toISOString(),
      };
      const saved = await fetch(`${db}/customerActivity/${encodeURIComponent(account.localId)}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: Object.fromEntries(Object.entries(activity).map(([key, value]) => [key, encode(value)])) }),
      });
      if (!saved.ok) throw new Error('Could not save customer sign-in activity.');
      return res.status(200).json({ ok: true });
    }

    if (!(await isAdmin(account, token))) return res.status(403).json({ error: 'Only store administrators can view customer sign-ins.' });
    const response = await fetch(`${db}/customerActivity?pageSize=1000`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error('Could not load customer sign-ins.');
    const users = (data.documents || []).map((doc) => ({ uid: doc.name.split('/').pop(), ...fields(doc) }))
      .sort((a, b) => String(b.lastLoginAt || '').localeCompare(String(a.lastLoginAt || '')));
    return res.status(200).json({ users });
  } catch (error) {
    console.error('customer-activity error:', error.message);
    return res.status(503).json({ error: 'Customer sign-in service is not available.' });
  }
}
