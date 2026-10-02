import { firebaseConfig } from './firebaseConfig.js';

const CUSTOMER_AUTH_KEY = 'az.firebase.customer.auth';
const ADMIN_AUTH_KEY = 'az.firebase.admin.auth';
const LEGACY_AUTH_KEY = 'az.firebase.auth';
const db = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
// Do not guess whether the old shared session belonged to a customer or an
// administrator. Both must sign in again after this migration.
try {
  localStorage.removeItem(LEGACY_AUTH_KEY);
  sessionStorage.removeItem(LEGACY_AUTH_KEY);
} catch { /* Storage can be unavailable in privacy-restricted browsers. */ }
const requireApiKey = () => {
  if (!firebaseConfig.apiKey) throw new Error('Firebase is not configured. Set VITE_FIREBASE_API_KEY and rebuild the site.');
  return encodeURIComponent(firebaseConfig.apiKey);
};
export const identityToolkitUrl = (path) => `https://identitytoolkit.googleapis.com/v1/${path}?key=${requireApiKey()}`;
const secureTokenUrl = () => `https://securetoken.googleapis.com/v1/token?key=${requireApiKey()}`;

const readSession = (key) => {
  try { return JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null'); }
  catch { return null; }
};

const saveSession = (key, value, remember = true) => {
  try {
    sessionStorage.removeItem(key); localStorage.removeItem(key);
    (remember ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
  } catch { throw new Error('Could not save your session on this device.'); }
};

const clearSession = (key) => { localStorage.removeItem(key); sessionStorage.removeItem(key); };
export const readCustomerAuth = () => readSession(CUSTOMER_AUTH_KEY);
export const readAdminAuth = () => readSession(ADMIN_AUTH_KEY);
export const saveCustomerAuth = (value, remember = true) => saveSession(CUSTOMER_AUTH_KEY, value, remember);
export const saveAdminAuth = (value, remember = true) => saveSession(ADMIN_AUTH_KEY, value, remember);
export const clearCustomerAuth = () => clearSession(CUSTOMER_AUTH_KEY);
export const clearAdminAuth = () => clearSession(ADMIN_AUTH_KEY);

export async function signIn(email, password) {
  const response = await fetch(identityToolkitUrl('accounts:signInWithPassword'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  return body;
}

export async function createAccount(email, password, displayName = '') {
  const response = await fetch(identityToolkitUrl('accounts:signUp'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  if (displayName.trim()) {
    const updateResponse = await fetch(identityToolkitUrl('accounts:update'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: body.idToken, displayName: displayName.trim(), returnSecureToken: true }),
    });
    const updated = await updateResponse.json().catch(() => ({}));
    if (!updateResponse.ok) throw new Error(authMessage(updated.error?.message));
    return { ...body, ...updated, displayName: displayName.trim() };
  }
  return body;
}

export async function signInWithGoogleCredential(credential) {
  const response = await fetch(identityToolkitUrl('accounts:signInWithIdp'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postBody: new URLSearchParams({ id_token: credential, providerId: 'google.com' }).toString(), requestUri: window.location.origin, returnIdpCredential: true, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  return body;
}

export async function createAdminAccount(email, password) {
  const response = await fetch(identityToolkitUrl('accounts:signUp'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  const verify = await fetch(identityToolkitUrl('accounts:sendOobCode'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: body.idToken }),
  });
  if (!verify.ok) throw new Error('Account created, but Firebase could not send the verification email. Check Firebase Authentication settings.');
  return true;
}

export async function sendPasswordReset(email) {
  const response = await fetch(identityToolkitUrl('accounts:sendOobCode'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
}

function authMessage(code) {
  const messages = {
    EMAIL_NOT_FOUND: 'That email was not found.',
    INVALID_PASSWORD: 'That password is not correct.',
    INVALID_LOGIN_CREDENTIALS: 'The email or password is not correct.',
    USER_DISABLED: 'This account is disabled. Contact the store owner.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Try again later.',
    EMAIL_EXISTS: 'That email is already registered.',
    OPERATION_NOT_ALLOWED: 'This sign-in method is not enabled in Firebase.',
    API_KEY_INVALID: 'Firebase rejected the API key. Check the Vercel Production environment variable.',
    INVALID_API_KEY: 'Firebase rejected the API key. Check the Vercel Production environment variable.',
    UNAUTHORIZED_DOMAIN: 'Firebase does not authorize this website domain for Google sign-in.',
    INVALID_IDP_RESPONSE: 'Firebase rejected the Google sign-in credential. Check the Google provider and OAuth client configuration.',
    INVALID_IDP_CREDENTIAL: 'Firebase rejected the Google sign-in credential. Check the Google provider and OAuth client configuration.',
    FEDERATED_USER_ID_ALREADY_LINKED: 'This Google account is already linked to another AZ Store account.',
    ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL: 'This email already has an AZ Store account using another sign-in method.',
    MISSING_OR_INVALID_NONCE: 'Google sign-in could not verify the login request. Refresh the page and try again.',
  };
  if (!code) return 'Firebase returned no error code. Check the browser network connection and Firebase API key.';
  return `${messages[code] || 'Firebase sign-in failed'} (Firebase error: ${code}).`;
}

export async function currentCustomerIdToken() { return token(CUSTOMER_AUTH_KEY, 'customer'); }
export async function currentAdminIdToken() { return token(ADMIN_AUTH_KEY, 'admin'); }

async function token(key, accountType) {
  const auth = readSession(key);
  if (!auth?.refreshToken) throw new Error(accountType === 'admin' ? 'Sign in to the admin panel first.' : 'Sign in to your customer account first.');
  if (accountType === 'admin' && (auth.isAdmin !== true || !['owner', 'admin'].includes(auth.role))) throw new Error('Sign in to an authorized admin account first.');
  if (accountType === 'customer' && (auth.isAdmin !== false || auth.role !== 'customer')) throw new Error('Sign in to your customer account first.');
  if (Date.now() < auth.expiresAt - 60_000) return auth.idToken;
  const response = await fetch(secureTokenUrl(), {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: auth.refreshToken }),
  });
  const body = await response.json();
  if (!response.ok) { clearSession(key); throw new Error('Your session expired. Sign in again.'); }
  saveSession(key, { ...auth, idToken: body.id_token, refreshToken: body.refresh_token, expiresAt: Date.now() + Number(body.expires_in) * 1000 }, auth.remember);
  return body.id_token;
}

export async function request(path, { method = 'GET', data, admin = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers.Authorization = `Bearer ${await currentAdminIdToken()}`;
  let response;
  try {
    const options = { method, headers, ...(data === undefined ? {} : { body: JSON.stringify({ fields: encodeFields(data) }) }) };
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') options.signal = AbortSignal.timeout(20000);
    response = await fetch(`${db}/${path}`, options);
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new Error('Firebase took too long to respond. Check your connection and try saving again.');
    throw new Error('Could not connect to Firebase. Check your internet connection and try again.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body.error?.status;
    if (code === 'PERMISSION_DENIED' || response.status === 401) throw new Error('Firebase rejected the operation. Check the admin account and Firestore rules.');
    const error = new Error(body.error?.message || 'Could not reach the store database.');
    error.code = code || response.status;
    throw error;
  }
  return body;
}

function encode(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
}

// Firestore Document.fields is a map of field names to Value objects.
// encode() returns a Value, so wrapping the whole map with encode() adds an
// invalid mapValue/value layer and Firestore rejects writes with "unknown name
// fields". Encode only each top-level field value here.
function encodeFields(value) {
  return Object.fromEntries(Object.entries(value).map(([key, fieldValue]) => [key, encode(fieldValue)]));
}

function decode(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]));
  return null;
}

export const decodeDocument = (doc) => ({ id: doc.name.split('/').pop(), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)])) });
export const listDocuments = async (collection, admin = false) => {
  const data = await request(`${collection}?pageSize=1000`, { admin });
  return (data.documents || []).map(decodeDocument);
};
export const getDocument = async (collection, id, admin = false) => {
  try { return decodeDocument(await request(`${collection}/${encodeURIComponent(id)}`, { admin })); }
  catch (error) { if (error.code === 404 || error.code === 'NOT_FOUND') return null; throw error; }
};
export const putDocument = async (collection, id, data, admin = false) => decodeDocument(await request(`${collection}/${encodeURIComponent(id)}`, { method: 'PATCH', data, admin }));
export const createDocument = async (collection, id, data, admin = false) => decodeDocument(await request(`${collection}?documentId=${encodeURIComponent(id)}`, { method: 'POST', data, admin }));
export const postDocument = async (collection, data, admin = false) => decodeDocument(await request(collection, { method: 'POST', data, admin }));
export const deleteDocument = (collection, id, admin = false) => request(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE', admin });
