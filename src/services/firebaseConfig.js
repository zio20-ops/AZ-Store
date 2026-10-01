// Firebase web configuration is public client configuration, not a server secret.
export const firebaseConfig = {
  // Supply the current Web App key through the build environment. The old
  // checked-in key is invalid and makes every Firebase Auth request fail.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: 'az-store-36cd0.firebaseapp.com',
  projectId: 'az-store-36cd0',
  storageBucket: 'az-store-36cd0.firebasestorage.app',
  messagingSenderId: '293330194438',
  appId: '1:293330194438:web:df32b411ec4ef32afb7387',
};

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const ADMIN_EMAIL = 'azstore700@gmail.com';
