# SP Marketplace — Deployment Guide

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com → **Add project** → name it `sp-marketplace`.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database → **Production mode** → choose a region (e.g. `asia-south1`).
4. **Storage** → Get started → Production mode.
5. (Optional, recommended) **App Check** → register the web app.

## 2. Configure the app

1. In Firebase console → Project settings → **Your apps** → Web app → copy the config values.
2. In this project: `cp .env.example .env` and fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
3. **Never commit `.env`.** On Vercel, add the same variables in Project Settings → Environment Variables.
4. Without keys the app runs in Demo Mode (localStorage demo data) — safe for testing, clearly labelled in the UI.

## 3. Deploy Firestore rules, indexes and Storage rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select your sp-marketplace project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Test rules first with the Emulator Suite:

```bash
firebase emulators:start --only firestore,auth,storage
# then run the security-rule checks in the Emulator UI
```

## 4. Deploy Cloud Functions

Functions need the **Blaze (pay-as-you-go)** plan for outbound gateway calls.

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 5. Create the first Super Admin (custom claims — the only trusted way)

Admin rights come from Firebase Admin SDK custom claims, **never** from a value the frontend sends.

```bash
# Option A — Firebase console: create a user in Authentication, copy its UID.
# Option B — run once from a trusted machine with firebase-admin:
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
admin.auth().setCustomUserClaims('<USER_UID>', { admin: true }).then(() => console.log('admin claim set'));
"
```

After the first admin exists, further roles are granted from the Admin Dashboard (Moderator Management) — which calls the `setAdminClaim` function. The frontend role field is display-only.

## 6. Seed production data

In production, demo data is **not** used. Seed Firestore with real data:

- `categories` — the 8 categories (see `src/data/demo.js` for the list).
- `sellers` / `stores` — created when a seller registers and is approved.
- `products` — created by sellers; they start `status: 'pending'` until an admin approves them.
- `settings` — `commissionRate: 0.10`, `shippingDhaka: 60`, `shippingOutsideDhaka: 120`, `freeShippingAbove: 1500`.
- `coupons`, `banners` — managed from the Admin Dashboard.

## 7. Payment gateways (real money — do this before launch)

- **bKash / Nagad:** register a merchant account; in v1 the app collects the customer's TrxID and an admin verifies it manually (Admin → Payments → `verifyPayment`). For automatic verification, wire the gateway's server-to-server callback to the `verifyPayment` function and check the gateway signature there — never accept a frontend success callback.
- **Card:** use a supported gateway (e.g. SSLCommerz / Stripe). Replace the demo card form's submit step with the gateway's hosted checkout / tokenisation. Card numbers must **never** touch your servers or Firestore.
- Verify in the Firebase console that no `payments` document contains a full card number.

## 8. Deploy to Vercel

```bash
npm run build
# Vercel dashboard → Add New Project → import the repo
# Framework: Vite · Build command: npm run build · Output: dist
# Add the VITE_FIREBASE_* environment variables (Production).
# Then Deploy. Add your domain and update the sitemap.xml / robots.txt URLs.
```

## 9. Post-launch checklist

- [ ] Rules deployed and tested in the Emulator Suite
- [ ] First admin created via custom claims; demo accounts removed/disabled
- [ ] bKash/Nagad merchant numbers replaced (currently `01XXX-XXXXXX (Demo)`)
- [ ] Support email/phone replaced (`support@spmarketplace.demo`)
- [ ] Google Search Console: verify ownership, submit `sitemap.xml`
- [ ] App Check enabled
- [ ] Backup: enable Firestore scheduled exports

## Image uploads (ImgBB, no Firebase Storage needed)

Firebase Storage on new projects requires the Blaze (pay-as-you-go) plan, so
SP Marketplace uploads product, logo and banner images to ImgBB instead:

- The browser never sees the ImgBB key. Uploads go to the server-side
  `api/upload.js` Vercel Serverless Function, which reads `IMGBB_API_KEY`
  from the environment and forwards the image to ImgBB.
- Set `IMGBB_API_KEY` in Vercel: Project → Settings → Environment Variables
  (Production). Redeploy after adding it. Without the variable, uploads fall
  back to a local preview and show a notice — nothing breaks.
- Never put the key in frontend code, in `.env` committed files, or in the
  public repo. For Cloud Functions use only, the same key name goes in
  `functions/.env` (gitignored).
