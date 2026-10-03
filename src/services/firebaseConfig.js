// Firebase web configuration is public client configuration, not a server secret.
export const firebaseConfig = {
  // This is Firebase's public Web API key. It identifies the web app; it is not
  // a service-account credential. The environment override supports rotation.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCLtsShJFypz4FqFsS6OPrAkMJuqegVgsg',
  authDomain: 'az-store-36cd0.firebaseapp.com',
  projectId: 'az-store-36cd0',
  storageBucket: 'az-store-36cd0.firebasestorage.app',
  messagingSenderId: '293330194438',
  appId: '1:293330194438:web:df32b411ec4ef32afb7387',
};

export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '293330194438-apnr52ti7c0fuvorrm88begr5ehtugum.apps.googleusercontent.com';

export const ADMIN_EMAIL = 'ziadabdo43320@gmail.com';
