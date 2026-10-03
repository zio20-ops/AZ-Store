# AZ Store Firebase setup

The storefront is still a Vite app and stays on Vercel. Firebase stores the catalogue, settings and orders. `/api/orders` is a Vercel server function that checks current prices and stock before writing an order.

## One-time setup

1. In Firebase Console, open **Authentication → Sign-in method** and enable **Email/Password**.
2. Google sign-in is enabled for the project. In **Authentication → Settings → Authorized domains**, add `az-store-gules.vercel.app`. Firebase Console's required public support email is currently `ziadabdo43320@gmail.com`; replace it with the store email after adding that email as a Google/Firebase project owner and verifying it.
3. Open **Firestore → Rules** and publish the contents of `firestore.rules`. The rules only allow the verified `azstore700@gmail.com` address to change store data. The order API uses its server credential, so customers cannot write orders directly to Firestore.
4. Create a Google Cloud service account for project `az-store-36cd0` with the **Cloud Datastore User** role. Create a JSON key. Keep the downloaded key private; do not put it in GitHub, this folder, or chat.
5. In the Vercel project, open **Settings → Environment Variables**. Add `FIREBASE_SERVICE_ACCOUNT` and paste the entire JSON key as its value for Production and Preview. Redeploy after saving it. Vercel Functions use this key to verify prices, reserve stock atomically, and write private orders.
6. Upload the changed project files to the GitHub repository connected to Vercel. Vercel will deploy the new commit. `vercel.json` preserves direct routes such as `/admin/login`.
7. Customers use `/account` to create an account with email/password or Google, then verify their email for password accounts. The Google OAuth client is configured in the app. The administrator can use Google sign-in at `/admin/login` with `azstore700@gmail.com`; email/password admin login remains available.
8. After deployment, sign in to `/admin`, open **Settings → Payment methods**, enter the store's InstaPay destination and/or Vodafone Cash wallet number, and enable the methods. Orders paid by manual transfer remain **Verification Required** until the administrator checks the transfer and marks them paid.

## Operating notes

- Customer-facing order tracking has been removed. Order status and customer details remain available to the administrator in the protected `orders` collection.
- Payment methods are cash on delivery and optional manual InstaPay/Vodafone Cash transfers. Manual transfers show the destination set in admin, collect a transfer reference, and require manual verification. This is a real transfer workflow, but it does not automatically receive payment confirmations. Card payments require a licensed payment provider and verified server-side callbacks; no card details are collected by this site.
- Product photos are resized before saving because they are stored in Firestore documents in this setup. Firebase Storage is not used.
- Firebase service-account credentials are required by `/api/orders`; checkout deliberately fails safely until that Vercel environment variable is configured.
