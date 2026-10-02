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
3. Open **Firestore → Rules** and publish the contents of `firestore.rules`. The rules allow the owner `ziadabdo43320@gmail.com` or an authenticated account whose UID has an `admins/{uid}` membership with role `admin` or `owner` to change store data. Email verification is not required for password sign-in. The `admins` collection can only be read by the signed-in account it belongs to and can only be written by the `/api/admin-users` server function (never directly from a browser). The order/track APIs use their server credential, so customers cannot write orders directly to Firestore.
4. Create a Google Cloud service account for project `az-store-36cd0` with the **Cloud Datastore User** role **and** the ability to manage Firebase Auth users (Identity Toolkit). Create a JSON key. Keep the downloaded key private; do not put it in GitHub, this folder, or chat.
5. In the Vercel project, open **Settings → Environment Variables**. Add `FIREBASE_SERVICE_ACCOUNT` and paste the entire JSON key as its value for Production and Preview. Also configure `FIREBASE_API_KEY`, `VITE_FIREBASE_API_KEY`, and `VITE_GOOGLE_CLIENT_ID`. Do not set `VITE_BACKEND=local` in Production. Redeploy after changing environment variables. Vercel Functions use the service account to verify prices, reserve stock atomically, write private orders, look up tracking, and create/delete admin users.

## Password sign-in and reset

Customers and administrators can sign in with email and password without verifying the email first. Creating an account does not send a verification email. Password reset is sent only when the user asks for it from the account or admin login screens.

## Transfer screenshot uploads

The checkout's Vodafone Cash and InstaPay proof upload uses the Firebase Storage bucket `az-store-36cd0.firebasestorage.app`. To enable it in production:

1. Ensure Cloud Storage for Firebase is set up and the project is on the Blaze pay-as-you-go plan. Storage access requires Blaze; actual charges depend on bucket location and usage. Configure a budget alert before enabling billing.
2. In Google Cloud IAM, grant the service account used by `FIREBASE_SERVICE_ACCOUNT` the **Storage Object Creator** role on this bucket (or a narrower custom role with object create permission).
3. In Vercel, optionally set `FIREBASE_STORAGE_BUCKET` to the exact bucket name if it differs from the default above, then redeploy.

Uploaded screenshots are compressed in the browser and saved as payment-proof files in Storage. Orders save the screenshot link for the admin Orders page. Customers can submit a screenshot, a transfer reference, or both. If Storage is unavailable, checkout can still be completed with the reference alone.

## Per-customer shopping carts

Verified customer carts are stored in Firestore as `customerCarts/{firebaseUid}` through `/api/customer-cart`. The API verifies the Firebase ID token and only reads or writes the matching customer's cart. The browser keeps a local cache for faster loading and offline fallback. Signing out clears the visible guest cart; signing back in restores that customer's cart. The existing Firestore service account configuration is used; no additional Vercel secret is required.
6. Upload the changed project files to the GitHub repository connected to Vercel. Vercel will deploy the new commit. `vercel.json` preserves direct routes such as `/admin/login`, `/admin/users` and `/track-order`.
7. Customers use `/account` to create an account with email/password or Google. Email/password sign-in does not require an email verification link. The store owner can use Google sign-in at `/admin/login` with `ziadabdo43320@gmail.com`; email/password admin login remains available.
8. After deployment, sign in to `/admin`, open **Settings → Payment methods**, enter the store's InstaPay destination and/or Vodafone Cash wallet number, and enable the methods. Orders paid by manual transfer remain **Verification Required** until the administrator checks the transfer in **Orders** and marks them paid.

## Managing administrators and passwords (after deployment)

- Sign in to `/admin` and open **Admin access** (`/admin/users`).
- **Add an administrator using an existing customer account**: enter the same email and leave the temporary password blank. The server looks up its existing Firebase UID and adds the admin role, preserving the existing password and sign-in method. **Add a new account**: enter an email and temporary password (minimum 8 characters); the server creates the Firebase Auth account and its `admins/{uid}` role. Existing users are never deleted when their admin role is removed.
- **Remove an administrator**: use **Remove** on their row. The owner account and the account you are signed in with cannot be removed.
- **Change or set your own password**: use **Change my password** in Admin access, or **Forgot password?** on the admin login page. For a Google-signed-in admin, the panel asks them to confirm the same Google account and then sets an email/password sign-in on that Firebase account; Google sign-in remains available. Password reset emails are sent by Firebase only when explicitly requested. The password belongs to the same Firebase account used on the storefront, so changing it also changes the storefront password.
- Only the owner (`ziadabdo43320@gmail.com`) or an existing admin with a valid session can call these management actions; `/api/admin-users` re-verifies the caller's ID token server-side.

## Operating notes

- Customer-facing order tracking is available at `/track-order`. A visitor enters the order number and the phone number used at checkout; `/api/track` returns only that order's minimal status (no other customer data). The `orders` collection itself stays private.
- Payment methods are cash on delivery and optional manual InstaPay/Vodafone Cash transfers. Manual transfers show the destination set in admin, collect a transfer reference, and require manual verification. This is a real transfer workflow, but it does not automatically receive payment confirmations. Card payments require a licensed payment provider (for example Stripe, Paymob or Checkout.com) and verified server-side callbacks; connect it in `api/orders.js` and add its option in Settings. No card numbers, CVVs or banking passwords are ever collected or stored by this site.
- Product photos are resized before saving because they are stored in Firestore documents in this setup. Firebase Storage is not used.
- Firebase service-account credentials are required by `/api/orders`, `/api/track` and `/api/admin-users`; checkout and admin user management deliberately fail safely until that Vercel environment variable is configured.
