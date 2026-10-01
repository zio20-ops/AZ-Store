// Backend transport selection.
//
// 'firebase' — Firestore catalogue/settings/orders + Firebase Auth + Vercel
//   server functions (/api/orders, /api/track, /api/admin-users). This is the
//   default so deployed storefront data stays in the cloud.
// 'local' — in-browser demo backend (localStorage), selected only for local
//   development with VITE_BACKEND=local.
//
// Both transports expose identical service APIs (productService, orderService,
// authService); swapping hosts never touches page components.

export const BACKEND = import.meta.env.VITE_BACKEND === 'local' ? 'local' : 'firebase';

export const isFirebase = BACKEND === 'firebase';
