// Firebase admin + customer authentication (production transport).
//
// Admin authorization is the `admins` Firestore collection plus the owner
// address below; the collection is written only by the /api/admin-users server
// function, which uses the Firebase service account. Password changes go
// through Firebase Auth REST with the caller's own token.

import { ADMIN_EMAIL, firebaseConfig } from './firebaseConfig.js';
import {
  clearAdminAuth, clearCustomerAuth, createAdminAccount, createAccount,
  readAdminAuth, readCustomerAuth, saveAdminAuth, saveCustomerAuth, sendPasswordReset,
  signIn, signInWithGoogleCredential, currentAdminIdToken, identityToolkitUrl,
} from './firebaseRest.js';
import { initializeCatalog } from './productService.js';

export { ADMIN_EMAIL } from './firebaseConfig.js';

const db = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

export const getCurrentUser = () => {
  const session = readCustomerAuth();
  if (!session?.idToken || !session.refreshToken) return null;
  return { uid: session.uid, email: session.email, name: session.displayName || session.email, emailVerified: Boolean(session.emailVerified), providerId: session.providerId || 'password', role: 'customer', isAdmin: false };
};

export const me = () => {
  const session = readAdminAuth();
  if (!session?.idToken || !session.refreshToken || session.isAdmin !== true || !['owner', 'admin'].includes(session.role)) return null;
  return { uid: session.uid, email: session.email, displayName: session.displayName || '', emailVerified: Boolean(session.emailVerified), providerId: session.providerId || 'password', role: session.role, isAdmin: true, name: session.role === 'owner' ? 'Store Owner' : (session.displayName || 'AZ Administrator') };
};

const sessionData = (result, extra = {}) => ({
    uid: result.localId, email: result.email, displayName: result.displayName || '', emailVerified: result.emailVerified,
    providerId: result.providerId || 'password', idToken: result.idToken, refreshToken: result.refreshToken,
    expiresAt: Date.now() + Number(result.expiresIn) * 1000, ...extra,
  });
const cacheCustomerSession = (result, remember) => {
  saveCustomerAuth(sessionData(result, { isAdmin: false, role: 'customer', remember }), remember);
  window.dispatchEvent(new Event('az-auth-changed'));
};
const cacheAdminSession = (result, remember, membership) => {
  saveAdminAuth(sessionData(result, { isAdmin: true, role: membership.role, remember }), remember);
  window.dispatchEvent(new Event('az-auth-changed'));
};

export const logoutCustomer = async () => { clearCustomerAuth(); window.dispatchEvent(new Event('az-auth-changed')); return { ok: true }; };
export const logoutAdmin = async () => { clearAdminAuth(); window.dispatchEvent(new Event('az-auth-changed')); return { ok: true }; };
const adminMembership = async (idToken, localId, email) => {
  if ((email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()) return { role: 'owner' };
  const response = await fetch(`${db}/admins/${encodeURIComponent(localId)}`, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!response.ok) return null;
  const doc = await response.json().catch(() => null);
  const role = doc?.fields?.role?.stringValue;
  return role ? { role } : null;
};

const ensureVerified = async (result) => {
  if (result.emailVerified) return true;
  const error = new Error('The administrator email must be verified before admin sign-in.');
  error.code = 'EMAIL_NOT_VERIFIED';
  throw error;
};

export const registerCustomer = async ({ name, email, password }) => {
  try {
    const result = await createAccount(email.trim(), password, name);
    cacheCustomerSession(result, true);
    void recordCustomerLogin(result.idToken);
    return { ok: true, user: getCurrentUser() };
  }
  catch (error) { return { ok: false, message: error.message }; }
};

export const loginCustomer = async (email, password, remember = true) => {
  try { const result = await signIn(email.trim(), password); cacheCustomerSession(result, remember); void recordCustomerLogin(result.idToken); return { ok: true, user: getCurrentUser() }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const loginWithGoogle = async (credential, remember = true) => {
  try { const result = await signInWithGoogleCredential(credential); cacheCustomerSession({ ...result, emailVerified: true, providerId: 'google.com' }, remember); void recordCustomerLogin(result.idToken); return { ok: true, user: getCurrentUser() }; }
  catch (error) { return { ok: false, message: error.message }; }
};

async function recordCustomerLogin(idToken) {
  try {
    await fetch('/api/customer-activity', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
  } catch { /* Keep sign-in available if activity recording is temporarily unavailable. */ }
}

export const listCustomerActivity = async () => {
  try {
    const response = await fetch('/api/customer-activity', { headers: { Authorization: `Bearer ${await currentAdminIdToken()}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Could not load customer sign-ins.');
    return { ok: true, users: result.users || [] };
  } catch (error) { return { ok: false, message: error.message, users: [] }; }
};

export const loginAdminWithGoogle = async (credential, remember = true) => {
  try {
    const result = await signInWithGoogleCredential(credential);
    const membership = await adminMembership(result.idToken, result.localId, result.email);
    if (!membership) return { ok: false, message: 'This Google account does not have admin access. Ask the store owner to add it from Admin access.' };
    if (result.emailVerified !== true) return { ok: false, message: 'The administrator email must be verified.' };
    cacheAdminSession({ ...result, emailVerified: true, providerId: 'google.com' }, remember, membership);
    await initializeCatalog();
    return { ok: true, session: me() };
  } catch (error) { return { ok: false, message: error.message }; }
};

// One-time setup path: creates the owner's Firebase account (owner email only).
export const register = async (email, password) => {
  if ((email || '').trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false, message: 'Only the store owner email can create the first admin account. Other admins are added from Admin access.' };
  try { await createAdminAccount(email.trim(), password); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const resetPassword = async (email) => {
  if ((email || '').trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false, message: 'Enter the store owner email to receive a reset link.' };
  try { await sendPasswordReset(email.trim()); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const resetCustomerPassword = async (email) => {
  try { await sendPasswordReset(email.trim()); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const login = async (email, password, remember = false) => {
  try {
    const result = await signIn(email.trim(), password);
    await ensureVerified(result);
    const membership = await adminMembership(result.idToken, result.localId, result.email);
    if (!membership) {
      clearAdminAuth();
      return { ok: false, message: 'This account does not have admin access. Ask the store owner to add it from Admin access.' };
    }
    cacheAdminSession(result, remember, membership);
    await initializeCatalog();
    return { ok: true, session: me() };
  } catch (error) { return { ok: false, message: error.message }; }
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const session = readAdminAuth();
  if (!session) return { ok: false, message: 'Your session expired. Sign in again.' };
  if (session.providerId === 'google.com') return { ok: false, message: 'This admin signs in with Google, so the password is managed by the Google account.' };
  if (String(newPassword || '').length < 8) return { ok: false, message: 'The new password needs at least 8 characters.' };
  try {
    await signIn(session.email, currentPassword || '');
  } catch {
    return { ok: false, message: 'Your current password is not correct.' };
  }
  const response = await fetch(identityToolkitUrl('accounts:update'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: session.idToken, password: newPassword, returnSecureToken: true }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, message: body.error?.message || 'Firebase rejected the password change.' };
  saveAdminAuth({ ...session, idToken: body.idToken, refreshToken: body.refreshToken, expiresAt: Date.now() + Number(body.expiresIn) * 1000 }, session.remember);
  return { ok: true };
};

const adminUsersApi = async (payload) => {
  const response = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await currentAdminIdToken()}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The admin user service is not available on this deployment.');
  return result;
};

export const listUsers = async () => {
  try { const result = await adminUsersApi({ action: 'list' }); return { ok: true, users: result.users }; }
  catch (error) { return { ok: false, message: error.message, users: [] }; }
};

export const addUser = async ({ email, password, role = 'admin' }) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim())) return { ok: false, message: 'Enter a valid email address.' };
  if (String(password || '').length < 8) return { ok: false, message: 'The temporary password needs at least 8 characters.' };
  if (!['admin', 'owner'].includes(role)) return { ok: false, message: 'Choose a valid administrator role.' };
  try { const result = await adminUsersApi({ action: 'create', email: email.trim(), password, role }); return { ok: true, user: result.user }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const removeUser = async (uid) => {
  try { await adminUsersApi({ action: 'delete', uid }); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const changeUserRole = async (uid, role) => {
  if (!['admin', 'owner'].includes(role)) return { ok: false, message: 'Choose a valid administrator role.' };
  try {
    const result = await adminUsersApi({ action: 'setRole', uid, role });
    return { ok: true, user: result.user };
  } catch (error) { return { ok: false, message: error.message }; }
};
