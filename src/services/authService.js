import { ADMIN_EMAIL, firebaseConfig } from './firebaseConfig.js';
import { clearAuth, createAdminAccount, createAccount, readAuth, saveAuth, sendPasswordReset, signIn, signInWithGoogleCredential } from './firebaseRest.js';
import { initializeCatalog } from './productService.js';
export { ADMIN_EMAIL } from './firebaseConfig.js';

export const me = () => {
  const session = getCurrentUser();
  if (!session || (session.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;
  return { ...session, name: 'AZ Administrator' };
};

export const getCurrentUser = () => {
  const session = readAuth();
  if (!session?.idToken || !session.refreshToken) return null;
  return { uid: session.uid, email: session.email, name: session.displayName || session.email, emailVerified: Boolean(session.emailVerified), providerId: session.providerId || 'password' };
};

const cacheSession = (result, remember) => {
  saveAuth({ uid: result.localId, email: result.email, displayName: result.displayName || '', emailVerified: result.emailVerified, providerId: result.providerId || 'password', idToken: result.idToken, refreshToken: result.refreshToken, expiresAt: Date.now() + Number(result.expiresIn) * 1000, remember }, remember);
  window.dispatchEvent(new Event('az-auth-changed'));
};

export const logout = async () => { clearAuth(); window.dispatchEvent(new Event('az-auth-changed')); return { ok: true }; };

const ensureVerified = async (result) => {
  if (result.emailVerified) return true;
  await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: result.idToken }),
  }).catch(() => {});
  throw new Error('راجع بريدك الإلكتروني واضغط رابط التأكيد قبل تسجيل الدخول.');
};

export const registerCustomer = async ({ name, email, password }) => {
  try { await createAccount(email.trim(), password, name); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const loginCustomer = async (email, password, remember = true) => {
  try { const result = await signIn(email.trim(), password); await ensureVerified(result); cacheSession(result, remember); return { ok: true, user: getCurrentUser() }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const loginWithGoogle = async (credential, remember = true) => {
  try { const result = await signInWithGoogleCredential(credential); cacheSession({ ...result, emailVerified: true, providerId: 'google.com' }, remember); return { ok: true, user: getCurrentUser() }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const loginAdminWithGoogle = async (credential, remember = true) => {
  try {
    const result = await signInWithGoogleCredential(credential);
    if (result.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false, message: 'Sign in with the authorized store administrator Google account.' };
    if (result.emailVerified !== true) return { ok: false, message: 'The administrator Google email must be verified.' };
    cacheSession({ ...result, providerId: 'google.com' }, remember);
    await initializeCatalog();
    return { ok: true, session: me() };
  } catch (error) { return { ok: false, message: error.message }; }
};

export const register = async (email, password) => {
  if ((email || '').trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false, message: 'هذا البريد غير مصرح له بإنشاء حساب الأدمن.' };
  try { await createAdminAccount(email.trim(), password); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const resetPassword = async (email) => {
  if ((email || '').trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false, message: 'اكتب بريد الأدمن المسجل.' };
  try { await sendPasswordReset(email.trim()); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const resetCustomerPassword = async (email) => {
  try { await sendPasswordReset(email.trim()); return { ok: true }; }
  catch (error) { return { ok: false, message: error.message }; }
};

export const login = async (email, password, remember = false) => {
  if ((email || '').trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false, message: 'هذا البريد غير مصرح له بإدارة المتجر.' };
  try {
    const result = await signIn(email.trim(), password);
    await ensureVerified(result);
    cacheSession(result, remember);
    await initializeCatalog();
    return { ok: true, session: me() };
  } catch (error) { return { ok: false, message: error.message }; }
};
