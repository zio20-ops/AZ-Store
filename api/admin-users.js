// Server-side admin user management: list / create / delete admin accounts.
// Runs on Vercel with the Firebase service account; callers prove they are an
// owner by presenting a valid Firebase idToken of the owner address (or an
// admins document with role "owner").

import { createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'azstore700@gmail.com').toLowerCase();
const db = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
let tokenCache;

const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { mapValue: { fields: { value: enc(v) } } };
};
const fields = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => {
  if ('stringValue' in v) return [k, v.stringValue];
  if ('integerValue' in v) return [k, Number(v.integerValue)];
  if ('booleanValue' in v) return [k, v.booleanValue];
  return [k, null];
}));
const b64url = (v) => Buffer.from(v).toString('base64url');

async function accessToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.value;
  let account;
  try { account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || ''); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain the service account JSON.'); }
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit.admin', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signer = createSign('RSA-SHA256'); signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString('base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const data = await response.json();
  if (!response.ok) throw new Error('Unable to authenticate with Firebase.');
  tokenCache = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

// Validates the caller's Firebase idToken and returns their account.
async function callerAccount(idToken) {
  if (!idToken) return null;
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_API_KEY is not configured.');
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return data.users?.[0] || null;
}

async function isOwner(account, token) {
  if (!account || account.emailVerified !== true) return false;
  if ((account.email || '').toLowerCase() === ADMIN_EMAIL) return true;
  const response = await fetch(`${db}/admins/${encodeURIComponent(account.localId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return false;
  const doc = await response.json().catch(() => null);
  return fields(doc).role === 'owner';
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const account = await callerAccount(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    const token = await accessToken();
    if (!(await isOwner(account, token))) return res.status(403).json({ error: 'Only the store owner can manage admin users.' });

    const { action, email, password, uid } = req.body || {};

    if (action === 'list') {
      const list = await fetch(`${db}/admins?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await list.json().catch(() => ({}));
      const users = (data.documents || []).map((d) => ({ uid: d.name.split('/').pop(), ...fields(d) }));
      return res.status(200).json({ users: [{ uid: 'owner', email: ADMIN_EMAIL, role: 'owner', createdAt: '' }, ...users] });
    }

    if (action === 'create') {
      const clean = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (String(password || '').length < 8) return res.status(400).json({ error: 'The temporary password needs at least 8 characters.' });
      if (clean === ADMIN_EMAIL) return res.status(400).json({ error: 'The owner account already exists.' });
      const created = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, password, emailVerified: true }),
      });
      const body = await created.json().catch(() => ({}));
      if (!created.ok) return res.status(409).json({ error: body.error?.message === 'EMAIL_EXISTS' ? 'That email already has an account. Use a password reset instead.' : 'Firebase could not create the account.' });
      await fetch(`${db}/admins?documentId=${encodeURIComponent(body.localId)}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { email: enc(clean), role: enc('admin'), createdAt: enc(new Date().toISOString()) } }),
      });
      return res.status(201).json({ user: { uid: body.localId, email: clean, role: 'admin', createdAt: new Date().toISOString() } });
    }

    if (action === 'delete') {
      const target = String(uid || '');
      if (!target || target === 'owner') return res.status(400).json({ error: 'The owner account cannot be removed.' });
      if (target === account.localId) return res.status(400).json({ error: 'You cannot remove the account you are signed in with.' });
      const deleted = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localId: target }),
      });
      if (!deleted.ok) return res.status(404).json({ error: 'That admin no longer exists.' });
      await fetch(`${db}/admins/${encodeURIComponent(target)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    console.error('admin-users error:', error.message);
    return res.status(503).json({ error: 'The admin user service is not configured on this deployment.' });
  }
}
