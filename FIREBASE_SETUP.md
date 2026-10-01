# AZ Store Firebase setup

The storefront is still a Vite app and stays on Vercel. Firebase stores the catalogue, settings and orders. `/api/orders` is a Vercel server function that checks current prices and stock before writing an order; `/api/track` serves public order tracking; `/api/admin-users` manages administrator accounts. All three use the Firebase service account so secrets and privileged writes never happen in the browser.

## Backend transport (dev / preview / production)

`src/services/backend.js` chooses the data transport automatically:

- The deployed storefront uses **Firebase** by default. Products, settings, authentication, and orders are stored or processed by Firebase and Vercel Functions, not in the visitor's browser.
- For local UI-only development, set `VITE_BACKEND=local`. Never set this on the production deployment; local demo data is not shared or durable.
- Set `VITE_FIREBASE_API_KEY` to the current Web App API key from Firebase Project settings and `VITE_GOOGLE_CLIENT_ID` to the matching Google OAuth client ID. Restrict the API key to required Firebase APIs and authorized website domains.

The admin demo login shown when `VITE_BACKEND=local` (`admin@azstore.eg` / the dev password) is **only** for the local demo backend. On Firebase, admin sign-in is restricted to the owner email (`ziadabdo43320@gmail.com`) plus admins you add.

## One-time setup

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**. The current public Web API key and Google client ID are included as web configuration defaults in `src/services/firebaseConfig.js`; you can override them with the Vercel variables above after rotating either value. These are public app identifiers, not private service credentials.
2. Google sign-in is enabled. In **Authentication → Settings → Authorized domains**, add the active Vercel hostname and every custom domain used for the store. Firebase Console's public support email is `ziadabdo43320@gmail.com`.
3. Open **Firestore → Rules** and publish the contents of `firestore.rules`. The rules allow the verified owner `ziadabdo43320@gmail.com` **or** any account present in the `admins/{uid}` collection to change store data. The `admins` collection can only be read by the signed-in admin it belongs to and can only be written by the `/api/admin-users` server function (never directly from a browser). The order/track APIs use their server credential, so customers cannot write orders directly to Firestore.
4. Create a Google Cloud service account for project `az-store-36cd0` with the **Cloud Datastore User** role **and** the ability to manage Firebase Auth users (Identity Toolkit). Create a JSON key. Keep the downloaded key private; do not put it in GitHub, this folder, or chat.
5. In the Vercel project, open **Settings → Environment Variables**. Add `FIREBASE_SERVICE_ACCOUNT` and paste the entire JSON key as its value for Production and Preview. Also configure `FIREBASE_API_KEY`, `VITE_FIREBASE_API_KEY`, and `VITE_GOOGLE_CLIENT_ID`. Do not set `VITE_BACKEND=local` in Production. Redeploy after changing environment variables. Vercel Functions use the service account to verify prices, reserve stock atomically, write private orders, look up tracking, and create/delete admin users.
6. Upload the changed project files to the GitHub repository connected to Vercel. Vercel will deploy the new commit. `vercel.json` preserves direct routes such as `/admin/login`, `/admin/users` and `/track-order`.
7. Customers use `/account` to create an account with email/password or Google, then verify their email for password accounts. The store owner can use Google sign-in at `/admin/login` with `ziadabdo43320@gmail.com`; email/password admin login remains available.
8. After deployment, sign in to `/admin`, open **Settings → Payment methods**, enter the store's InstaPay destination and/or Vodafone Cash wallet number, and enable the methods. Orders paid by manual transfer remain **Verification Required** until the administrator checks the transfer in **Orders** and marks them paid.

## Managing administrators and passwords (after deployment)

- Sign in to `/admin` and open **Admin access** (`/admin/users`).
- **Add an administrator**: enter their email and a temporary password (min 8 characters). This creates a Firebase Auth account (email pre-verified) and an `admins/{uid}` document via `/api/admin-users`. Share the temporary password through a private channel; they change it themselves after signing in.
- **Remove an administrator**: use **Remove** on their row. The owner account and the account you are signed in with cannot be removed.
- **Change your own password**: use the **Change my password** card. It re-verifies your current password before updating. Admins who sign in with Google manage their password through their Google account.
- Only the owner (`ziadabdo43320@gmail.com`) or an existing admin with a valid session can call these management actions; `/api/admin-users` re-verifies the caller's ID token server-side.

## Operating notes

- Customer-facing order tracking is available at `/track-order`. A visitor enters the order number and the phone number used at checkout; `/api/track` returns only that order's minimal status (no other customer data). The `orders` collection itself stays private.
- Payment methods are cash on delivery and optional manual InstaPay/Vodafone Cash transfers. Manual transfers show the destination set in admin, collect a transfer reference, and require manual verification. This is a real transfer workflow, but it does not automatically receive payment confirmations. Card payments require a licensed payment provider (for example Stripe, Paymob or Checkout.com) and verified server-side callbacks; connect it in `api/orders.js` and add its option in Settings. No card numbers, CVVs or banking passwords are ever collected or stored by this site.
- Product photos are resized before saving because they are stored in Firestore documents in this setup. Firebase Storage is not used.
- Firebase service-account credentials are required by `/api/orders`, `/api/track` and `/api/admin-users`; checkout and admin user management deliberately fail safely until that Vercel environment variable is configured.
