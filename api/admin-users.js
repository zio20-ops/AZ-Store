// Server-side admin user management. Admins may manage admin accounts; only
// owners may grant or remove owner privileges.

import { createSign } from 'node:crypto';

const projectId = 'az-store-36cd0';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'ziadabdo43320@gmail.com').toLowerCase();
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
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
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
  const token = await accessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Firebase account verification failed (HTTP ${response.status}).`);
  return data.users?.[0] || null;
}

async function accountByEmail(email, token) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Firebase could not look up that account.');
  return (data.users || []).find((user) => (user.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function callerRole(account, token) {
  if (!account || account.emailVerified !== true) return null;
  if ((account.email || '').toLowerCase() === ADMIN_EMAIL) return 'owner';
  const response = await fetch(`${db}/admins/${encodeURIComponent(account.localId)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;
  const doc = await response.json().catch(() => null);
  const role = fields(doc).role;
  return ['owner', 'admin'].includes(role) ? role : null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const token = await accessToken();
    const account = await callerAccount(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    const caller = await callerRole(account, token);
    if (!caller) return res.status(403).json({ error: 'Only an authorized administrator can manage admin users.' });

    const { action, email, password, uid } = req.body || {};

    if (action === 'list') {
      const list = await fetch(`${db}/admins?pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await list.json().catch(() => ({}));
      const users = (data.documents || []).map((d) => ({ uid: d.name.split('/').pop(), ...fields(d) }))
        .filter((user) => (user.email || '').toLowerCase() !== ADMIN_EMAIL);
      return res.status(200).json({ users: [{ uid: 'owner', email: ADMIN_EMAIL, role: 'owner', createdAt: '' }, ...users] });
    }

    if (action === 'create') {
      const clean = String(email || '').trim().toLowerCase();
      const role = String(req.body?.role || 'admin');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!['admin', 'owner'].includes(role)) return res.status(400).json({ error: 'Choose a valid account role.' });
      if (role === 'owner' && caller !== 'owner') return res.status(403).json({ error: 'Only an owner can grant owner access.' });
      if (clean === ADMIN_EMAIL) return res.status(400).json({ error: 'The owner account already exists.' });
      const existing = await accountByEmail(clean, token);
      let target = existing;
      let createdNewAccount = false;
      if (!target) {
        if (String(password || '').length < 8) return res.status(400).json({ error: 'This email is not registered yet. Enter a temporary password to create its account.' });
        const created = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: clean, password, emailVerified: true }),
        });
        const body = await created.json().catch(() => ({}));
        if (!created.ok) return res.status(409).json({ error: body.error?.message === 'EMAIL_EXISTS' ? 'This account was just created elsewhere. Retry adding its admin access.' : 'Firebase could not create the account.' });
        target = body;
        createdNewAccount = true;
      }

      const priorMembership = await fetch(`${db}/admins/${encodeURIComponent(target.localId)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (priorMembership.ok) return res.status(409).json({ error: 'This account already has admin access. Find it in the Administrators list.' });
      if (priorMembership.status !== 404) return res.status(503).json({ error: 'Could not check this account’s current access.' });

      const membership = await fetch(`${db}/admins?documentId=${encodeURIComponent(target.localId)}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { email: enc(clean), role: enc(role), createdAt: enc(new Date().toISOString()) } }),
      });
      if (!membership.ok) {
        if (createdNewAccount) {
          await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ localId: target.localId }),
          }).catch(() => {});
        }
        return res.status(503).json({ error: createdNewAccount ? 'Could not save the admin role. The new account was rolled back.' : 'Could not add the admin role. The existing account was left unchanged.' });
      }
      return res.status(201).json({ user: { uid: target.localId, email: clean, role, createdAt: new Date().toISOString() }, existingAccount: Boolean(existing) });
    }

    if (action === 'delete') {
      const target = String(uid || '');
      if (!target || target === 'owner') return res.status(400).json({ error: 'The primary owner account cannot be removed.' });
      if (target === account.localId) return res.status(400).json({ error: 'You cannot remove the account you are signed in with.' });
      const targetResponse = await fetch(`${db}/admins/${encodeURIComponent(target)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!targetResponse.ok) return res.status(404).json({ error: 'That admin no longer exists.' });
      const targetUser = fields(await targetResponse.json().catch(() => ({})));
      if ((targetUser.email || '').toLowerCase() === ADMIN_EMAIL) return res.status(400).json({ error: 'The primary owner account cannot be removed.' });
      if (targetUser.role === 'owner' && caller !== 'owner') return res.status(403).json({ error: 'Only an owner can remove another owner.' });
      if (!['admin', 'owner'].includes(targetUser.role)) return res.status(400).json({ error: 'That account does not have an administrator role.' });
      const removed = await fetch(`${db}/admins/${encodeURIComponent(target)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!removed.ok) return res.status(503).json({ error: 'Could not remove that administrator role.' });
      return res.status(200).json({ ok: true });
    }

    if (action === 'setRole') {
      if (caller !== 'owner') return res.status(403).json({ error: 'Only an owner can change administrator roles.' });
      const target = String(uid || '');
      const role = String(req.body?.role || '');
      if (!target || target === 'owner') return res.status(400).json({ error: 'The primary owner role cannot be changed.' });
      if (target === account.localId) return res.status(400).json({ error: 'You cannot change your own role.' });
      if (!['admin', 'owner'].includes(role)) return res.status(400).json({ error: 'Choose a valid administrator role.' });
      const targetResponse = await fetch(`${db}/admins/${encodeURIComponent(target)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!targetResponse.ok) return res.status(404).json({ error: 'That admin no longer exists.' });
      const targetUser = fields(await targetResponse.json().catch(() => ({})));
      if ((targetUser.email || '').toLowerCase() === ADMIN_EMAIL) return res.status(400).json({ error: 'The primary owner role cannot be changed.' });
      if (!['admin', 'owner'].includes(targetUser.role)) return res.status(400).json({ error: 'That account does not have an administrator role.' });
      const updated = await fetch(`${db}/admins/${encodeURIComponent(target)}?updateMask.fieldPaths=role`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { role: enc(role) } }),
      });
      if (!updated.ok) return res.status(503).json({ error: 'Could not update that administrator role.' });
      return res.status(200).json({ user: { uid: target, email: targetUser.email, role, createdAt: targetUser.createdAt || '' } });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    console.error('admin-users error:', error.message);
    return res.status(503).json({ error: 'The admin user service is not configured on this deployment.' });
  }
}
