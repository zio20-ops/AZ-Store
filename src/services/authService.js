// Auth service facade — see services/backend.js for transport selection.
// Admin auth, password change and user management work on both transports;
// customer accounts exist only on the hosted (Firebase) deployment.

import { isFirebase } from './backend.js';
import * as fb from './firebaseAuthService.js';
import * as local from './localAuthService.js';

export const ADMIN_EMAIL = fb.ADMIN_EMAIL;
export const DEMO_EMAIL = local.DEMO_EMAIL;
export const DEMO_PASSWORD = local.DEMO_PASSWORD;

export const me = () => (isFirebase ? fb.me() : local.me());
export const logout = () => (isFirebase ? fb.logout() : local.logout());
export const login = (email, password, remember) => (isFirebase ? fb.login(email, password, remember) : local.login(email, password, remember));
export const register = (email, password) => (isFirebase ? fb.register(email, password) : local.login(email, password).then(() => ({ ok: false, message: 'Demo mode already includes an owner account.' })));
export const resetPassword = (email) => (isFirebase ? fb.resetPassword(email) : local.resetPassword(email));
export const changePassword = (payload) => (isFirebase ? fb.changePassword(payload) : local.changePassword(payload));
export const listUsers = () => (isFirebase ? fb.listUsers() : local.listUsers().then((users) => ({ ok: true, users })));
export const addUser = (payload) => (isFirebase ? fb.addUser(payload) : local.addUser(payload));
export const removeUser = (uid) => (isFirebase ? fb.removeUser(uid) : local.removeUser(uid));
export const loginAdminWithGoogle = (credential, remember) => (isFirebase ? fb.loginAdminWithGoogle(credential, remember) : Promise.resolve({ ok: false, message: 'Google sign-in is available on the hosted deployment.' }));

const hostedOnly = { ok: false, message: 'Customer accounts are available on the hosted deployment.' };
export const getCurrentUser = () => (isFirebase ? fb.getCurrentUser() : null);
export const registerCustomer = (payload) => (isFirebase ? fb.registerCustomer(payload) : Promise.resolve(hostedOnly));
export const loginCustomer = (email, password, remember) => (isFirebase ? fb.loginCustomer(email, password, remember) : Promise.resolve(hostedOnly));
export const loginWithGoogle = (credential, remember) => (isFirebase ? fb.loginWithGoogle(credential, remember) : Promise.resolve(hostedOnly));
export const listCustomerActivity = () => (isFirebase ? fb.listCustomerActivity() : Promise.resolve({ ok: true, users: [] }));
export const resetCustomerPassword = (email) => (isFirebase ? fb.resetCustomerPassword(email) : Promise.resolve(hostedOnly));
