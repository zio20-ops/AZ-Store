import { firebaseConfig } from './firebaseConfig.js';

const AUTH_KEY = 'az.firebase.auth';
const db = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

export const readAuth = () => {
  try { return JSON.parse(sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY) || 'null'); }
  catch { return null; }
};

export const saveAuth = (value, remember = true) => {
  try {
    sessionStorage.removeItem(AUTH_KEY); localStorage.removeItem(AUTH_KEY);
    (remember ? localStorage : sessionStorage).setItem(AUTH_KEY, JSON.stringify(value));
  } catch { throw new Error('Could not save your session on this device.'); }
};

export const clearAuth = () => { localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(AUTH_KEY); };

export async function signIn(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  return body;
}

export async function createAccount(email, password, displayName = '') {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  if (displayName.trim()) {
    await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: body.idToken, displayName: displayName.trim(), returnSecureToken: true }),
    });
  }
  const verification = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: body.idToken }),
  });
  if (!verification.ok) throw new Error('Account created, but Firebase could not send its verification email.');
  return true;
}

export async function signInWithGoogleCredential(credential) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postBody: new URLSearchParams({ id_token: credential, providerId: 'google.com' }).toString(), requestUri: window.location.origin, returnIdpCredential: true, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  return body;
}

export async function createAdminAccount(email, password) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
  const verify = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken: body.idToken }),
  });
  if (!verify.ok) throw new Error('تم إنشاء الحساب لكن تعذر إرسال رسالة التأكيد. راجع إعدادات Firebase Authentication.');
  return true;
}

export async function sendPasswordReset(email) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(authMessage(body.error?.message));
}

function authMessage(code) {
  if (code === 'EMAIL_NOT_FOUND' || code === 'INVALID_PASSWORD' || code === 'INVALID_LOGIN_CREDENTIALS') return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (code === 'USER_DISABLED') return 'تم تعطيل هذا الحساب. تواصل مع مسؤول المتجر.';
  if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER') return 'محاولات كثيرة. حاول مرة أخرى لاحقًا.';
  if (code === 'EMAIL_EXISTS') return 'هذا البريد مسجل بالفعل.';
  if (code === 'OPERATION_NOT_ALLOWED') return 'طريقة تسجيل الدخول دي مش مفعلة في Firebase لسه.';
  return 'تعذر تسجيل الدخول. تحقق من الاتصال وإعدادات Firebase.';
}

async function token() {
  const auth = readAuth();
  if (!auth?.refreshToken) throw new Error('سجّل الدخول إلى لوحة الإدارة أولًا.');
  if (Date.now() < auth.expiresAt - 60_000) return auth.idToken;
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: auth.refreshToken }),
  });
  const body = await response.json();
  if (!response.ok) { clearAuth(); throw new Error('انتهت الجلسة. سجّل الدخول مرة أخرى.'); }
  saveAuth({ ...auth, idToken: body.id_token, refreshToken: body.refresh_token, expiresAt: Date.now() + Number(body.expires_in) * 1000 }, auth.remember);
  return body.id_token;
}

export async function request(path, { method = 'GET', data, admin = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) headers.Authorization = `Bearer ${await token()}`;
  const response = await fetch(`${db}/${path}`, { method, headers, ...(data === undefined ? {} : { body: JSON.stringify({ fields: encode(data) }) }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = body.error?.status;
    if (code === 'PERMISSION_DENIED' || response.status === 401) throw new Error('Firebase رفض العملية. تحقق من حساب الأدمن وقواعد Firestore.');
    throw new Error(body.error?.message || 'تعذر الاتصال بقاعدة البيانات.');
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
  catch (error) { if (error.message.includes('NOT_FOUND')) return null; throw error; }
};
export const putDocument = async (collection, id, data, admin = false) => decodeDocument(await request(`${collection}/${encodeURIComponent(id)}`, { method: 'PATCH', data, admin }));
export const createDocument = async (collection, id, data, admin = false) => decodeDocument(await request(`${collection}?documentId=${encodeURIComponent(id)}`, { method: 'POST', data, admin }));
export const postDocument = async (collection, data, admin = false) => decodeDocument(await request(collection, { method: 'POST', data, admin }));
export const deleteDocument = (collection, id, admin = false) => request(`${collection}/${encodeURIComponent(id)}`, { method: 'DELETE', admin });
