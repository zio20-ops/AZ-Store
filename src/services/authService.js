// Mock admin authentication for local development.
//
// This module is the ONLY place that knows about admin credentials, and it never
// stores a plaintext password: the demo password is kept as a SHA-256 digest and
// sessions are random tokens with an expiry, never the password itself.
//
// Swap this file for a real backend without touching the pages:
//   POST /api/admin/login   { email, password, remember }  -> sets http-only cookie
//   POST /api/admin/logout
//   GET  /api/admin/me                                     -> current session or 401
// Production must add: server-side password hashing (bcrypt/argon2), http-only
// secure cookies, server-side authorization on every /api/admin/* endpoint,
// session expiration and rate limiting on login attempts.

import { readStorage, writeStorage } from '../utils/format.js';

const SESSION_KEY = 'az.admin.session';
const ATTEMPTS_KEY = 'az.admin.attempts';

export const DEMO_EMAIL = 'admin@azstore.eg';
export const DEMO_PASSWORD = 'AZ-admin!2026';
const DEMO_PASSWORD_SHA256 = 'a9a7637a4f3b2f391e733a6f769e07cbfd1b6ad7abf266bcd371c86259242c99';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
const REMEMBER_MS = 7 * 24 * 60 * 60_000;
const SESSION_MS = 4 * 60 * 60_000;

const sha256 = async (text) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

// Synchronous session check used by route guards.
export const me = () => {
  const session = readSessionRaw();
  if (!session || !session.expiresAt || Date.now() > session.expiresAt) {
    if (session) clearSession();
    return null;
  }
  return { email: session.email, name: session.name, expiresAt: session.expiresAt };
};

export const logout = () => {
  clearSession();
  return Promise.resolve({ ok: true });
};

export const login = async (email, password, remember = false) => {
  const attempts = readStorage(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 });
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    const secs = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return { ok: false, message: `Too many attempts. Try again in ${secs}s.` };
  }

  // Simulated network round-trip to the future POST /api/admin/login.
  await new Promise((r) => setTimeout(r, 350));

  const digest = await sha256(password || '');
  const valid = (email || '').trim().toLowerCase() === DEMO_EMAIL && digest === DEMO_PASSWORD_SHA256;

  if (!valid) {
    const count = (attempts.count || 0) + 1;
    const locked = count >= MAX_ATTEMPTS;
    writeStorage(ATTEMPTS_KEY, { count: locked ? 0 : count, lockedUntil: locked ? Date.now() + LOCK_MS : 0 });
    return {
      ok: false,
      message: locked
        ? 'Too many attempts. Try again in 60s.'
        : `Invalid email or password. ${MAX_ATTEMPTS - count} tries left.`,
    };
  }

  writeStorage(ATTEMPTS_KEY, { count: 0, lockedUntil: 0 });
  const session = {
    token: crypto.randomUUID(),
    email: DEMO_EMAIL,
    name: 'AZ Administrator',
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
