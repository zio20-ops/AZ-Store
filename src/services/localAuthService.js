// In-browser admin authentication and user management for dev/static previews.
//
// Security model mirrors what the Firebase transport enforces in production:
// passwords are never stored — only SHA-256 digests; sessions are random tokens
// with an expiry; login attempts are rate limited. The user list, password
// change and add/remove flows exposed here match services/firebaseAuthService.js
// so the admin UI behaves identically on both transports.

import { readStorage, writeStorage } from '../utils/format.js';

const USERS_KEY = 'az.admin.users';
const SESSION_KEY = 'az.admin.session';
const ATTEMPTS_KEY = 'az.admin.attempts';

export const DEMO_EMAIL = 'admin@azstore.eg';
export const DEMO_PASSWORD = 'AZ-admin!2026';
const OWNER_DIGEST = 'a9a7637a4f3b2f391e733a6f769e07cbfd1b6ad7abf266bcd371c86259242c99'; // SHA-256 of the dev password

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
const REMEMBER_MS = 7 * 24 * 60 * 60_000;
const SESSION_MS = 4 * 60 * 60_000;

const sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const ensureUsers = () => {
  const users = readStorage(USERS_KEY, null);
  if (users) return users;
  const seeded = [
    { id: 'owner', email: DEMO_EMAIL, digest: OWNER_DIGEST, role: 'owner', provider: 'password', createdAt: new Date().toISOString() },
  ];
  writeStorage(USERS_KEY, seeded);
  return seeded;
};

const readSessionRaw = () => {
  const local = readStorage(SESSION_KEY, null);
  if (local) return local;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
};

export const me = () => {
  const session = readSessionRaw();
  if (!session || !session.expiresAt || Date.now() > session.expiresAt) {
    if (session) clearSession();
    return null;
  }
  return { uid: session.userId, email: session.email, name: session.name, role: session.role, expiresAt: session.expiresAt };
};

export const logout = () => {
  clearSession();
  return Promise.resolve({ ok: true });
};

const lockState = () => readStorage(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 });

export const login = async (email, password, remember = false) => {
  const attempts = lockState();
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    const secs = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return { ok: false, message: `Too many attempts. Try again in ${secs}s.` };
  }
  await new Promise((r) => setTimeout(r, 350));
  const users = ensureUsers();
  const user = users.find((u) => u.email.toLowerCase() === String(email || '').trim().toLowerCase());
  const digest = await sha256(password || '');
  if (!user || user.digest !== digest) {
    const count = (attempts.count || 0) + 1;
    const locked = count >= MAX_ATTEMPTS;
    writeStorage(ATTEMPTS_KEY, { count: locked ? 0 : count, lockedUntil: locked ? Date.now() + LOCK_MS : 0 });
    return { ok: false, message: locked ? 'Too many attempts. Try again in 60s.' : `Invalid email or password. ${MAX_ATTEMPTS - count} tries left.` };
  }
  writeStorage(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 });
  const session = {
    token: crypto.randomUUID(),
    userId: user.id,
    email: user.email,
    name: user.role === 'owner' ? 'Store Owner' : 'AZ Administrator',
    role: user.role,
    expiresAt: Date.now() + (remember ? REMEMBER_MS : SESSION_MS),
  };
  try {
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    return { ok: false, message: 'Unable to start a session on this device.' };
  }
  return { ok: true, session: me() };
};

export const listUsers = async () => {
  if (!me()) return [];
  return ensureUsers().map((u) => ({ id: u.id, email: u.email, role: u.role, provider: u.provider, createdAt: u.createdAt }));
};

export const addUser = async ({ email, password, role = 'admin' }) => {
  const clean = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return { ok: false, message: 'Enter a valid email address.' };
  if (String(password || '').length < 8) return { ok: false, message: 'The temporary password needs at least 8 characters.' };
  const session = me();
  if (!session || !['admin', 'owner'].includes(session.role)) return { ok: false, message: 'Sign in as an administrator first.' };
  if (!['admin', 'owner'].includes(role)) return { ok: false, message: 'Choose a valid administrator role.' };
  if (role === 'owner' && session?.role !== 'owner') return { ok: false, message: 'Only an owner can grant owner access.' };
  const users = ensureUsers();
  if (users.some((u) => u.email.toLowerCase() === clean)) return { ok: false, message: 'That email already has admin access.' };
  const user = { id: crypto.randomUUID(), email: clean, digest: await sha256(password), role, provider: 'password', createdAt: new Date().toISOString() };
  writeStorage(USERS_KEY, [...users, user]);
  return { ok: true, user: { id: user.id, email: user.email, role: user.role, provider: user.provider, createdAt: user.createdAt } };
};

export const removeUser = async (id) => {
  const session = me();
  if (!session || !['admin', 'owner'].includes(session.role)) return { ok: false, message: 'Sign in as an administrator first.' };
  const users = ensureUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return { ok: false, message: 'That admin no longer exists.' };
  if (target.id === 'owner') return { ok: false, message: 'The primary owner account cannot be removed.' };
  if (target.role === 'owner' && session?.role !== 'owner') return { ok: false, message: 'Only an owner can remove another owner.' };
  if (session?.uid === id) return { ok: false, message: 'You cannot remove the account you are signed in with.' };
  writeStorage(USERS_KEY, users.filter((u) => u.id !== id));
  return { ok: true };
};

export const changeUserRole = async (id, role) => {
  const session = me();
  if (session?.role !== 'owner') return { ok: false, message: 'Only an owner can change administrator roles.' };
  if (!['admin', 'owner'].includes(role)) return { ok: false, message: 'Choose a valid administrator role.' };
  if (id === 'owner') return { ok: false, message: 'The primary owner role cannot be changed.' };
  if (session.uid === id) return { ok: false, message: 'You cannot change your own role.' };
  const users = ensureUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return { ok: false, message: 'That admin no longer exists.' };
  writeStorage(USERS_KEY, users.map((u) => u.id === id ? { ...u, role } : u));
  return { ok: true, user: { id, email: target.email, role } };
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  if (String(newPassword || '').length < 8) return { ok: false, message: 'The new password needs at least 8 characters.' };
  const session = me();
  if (!session) return { ok: false, message: 'Your session expired. Sign in again.' };
  const users = ensureUsers();
  const user = users.find((u) => u.id === session.uid);
  if (!user) return { ok: false, message: 'Your admin account no longer exists.' };
  if (user.digest !== await sha256(currentPassword || '')) return { ok: false, message: 'Your current password is not correct.' };
  const digest = await sha256(newPassword);
  writeStorage(USERS_KEY, users.map((u) => (u.id === user.id ? { ...u, digest } : u)));
  return { ok: true };
};

export const resetPassword = async () => ({
  ok: false,
  message: 'Password reset emails are available on the hosted deployment. In demo mode, change the password from Admin access while signed in.',
});

export const initializeCatalog = async () => {
  const { initializeCatalog: seed } = await import('./localProductService.js');
  await seed();
};
