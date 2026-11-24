# SP Marketplace — Deployment Guide

## 0. Going live — do these in order

1. **Publish the updated `firestore.rules`** in the Firebase console (§3). The
   file changed on 2026-11-24: client checkout writes and the doc-role admin
   bootstrap only work with the new rules. Do this *before* enabling Firebase
   on the live site.
2. **Set the `VITE_FIREBASE_*` variables on Vercel** (§2) and redeploy.
3. **Register the first admin account in the live app** (§5), then set its
   `users/{uid}` doc `role` to `admin` in the console.
4. **Run the seed script** (§6) with that admin account so the shop has products.
5. Verify: homepage loads real products, login works, a test COD order appears
   in Admin → Orders.

## 1. Create the Firebase project

The project already exists: **`sp-marketplace-7c3b6`** (Spark plan, no Blaze,
no billing), region **`asia-southeast1` (Singapore)**.

1. Go to https://console.firebase.google.com → open `sp-marketplace-7c3b6`.
2. **Authentication** → Sign-in method → **Email/Password** is enabled.
3. **Firestore Database** → created in **Production mode**, `asia-southeast1`.
4. **Storage** → NOT enabled: Firebase Storage on new projects requires the
   Blaze (pay-as-you-go) plan. Image uploads use ImgBB instead — see
   "Image uploads (ImgBB…)" at the bottom. Do not enable Storage unless the
   project is upgraded to Blaze.
5. (Optional, recommended) **App Check** → register the web app.

## 2. Configure the app

1. In Firebase console → Project settings → **Your apps** → Web app → copy the config values.
2. In this project: `cp .env.example .env` and fill in `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
3. **Never commit `.env`.** On Vercel, add the same variables in Project Settings → Environment Variables.
4. Without keys the app runs in Demo Mode (localStorage demo data) — safe for testing, clearly labelled in the UI.

## 3. Deploy Firestore rules, indexes and Storage rules

Rules are deployed from the Firebase console (no CLI login needed):

1. **Firestore Database → Rules** → replace the contents with the exact
   contents of `firestore.rules` in this repo → **Publish**.
2. **Firestore Database → Indexes** → add the composite indexes from
   `firestore.indexes.json` if the console reports a missing-index error.
3. Storage rules are skipped — there is no Storage bucket (Spark plan);
   image uploads go through ImgBB (see bottom).

Or with the CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # select sp-marketplace-7c3b6
firebase deploy --only firestore:rules,firestore:indexes
```

> ⚠️ The rules file changed on 2026-11-24 and must be re-published before the
> live site uses Firebase: it allows constrained client checkout writes
> (`orders` / `sellerOrders` / `payments`) and trusts the `users/{uid}` doc
> `role` for admin/moderator until the `setAdminClaim` Cloud Function is live
> (Blaze plan). Without republishing, checkout and admin writes are denied.

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

## 5. Create the first Super Admin (one-time bootstrap)

Until Cloud Functions are deployed (Blaze plan), admin rights come from the
`role` field on the user's Firestore document — the rules trust it (see
`firestore.rules` header). Do this once:

1. Open the live site and **register a normal account** (Register page) with
   the email that should be the admin. Log out.
2. In the Firebase console → **Firestore Database** → collection `users` →
   open the document whose id is that account's UID (find it in
   **Authentication → Users** if unsure) → set the field **`role` to `admin`**
   (it was `customer`) → Save.
3. Log in again on the live site — the account now opens `/admin`.

Do NOT invent an admin account or share its password in chat/files. The
first admin is a real account the owner registers themselves.

Later, when Functions are live (Blaze): set the custom claim instead — the
strong, long-term mechanism — and remove the doc-role fallback from the rules:

```bash
# Option A — Firebase console: create a user in Authentication, copy its UID.
# Option B — run once from a trusted machine with firebase-admin:
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
admin.auth().setCustomUserClaims('<USER_UID>', { admin: true }).then(() => console.log('admin claim set'));
"
```

After the first admin exists, further roles are granted by editing the
`role` field on a user's `users/{uid}` document in the console
(`admin` / `moderator` / `seller` / `customer`). The frontend role field is
display-only — a client can never change its own role (blocked by the rules).

## 6. Seed production data

In production, demo data is **not** used. Seed Firestore once with the
catalogue from `src/data/demo.js` using the script (run from the project
root, after §5 — the seed account must be the admin):

```bash
FIREBASE_SEED_EMAIL=you@example.com FIREBASE_SEED_PASSWORD='...' npm run seed:firestore
```

- Firebase config comes from `.env` (`VITE_FIREBASE_*`) or exported env vars.
- The script refuses to run if `products` is not empty; re-run with
  `--force` to overwrite: `npm run seed:firestore -- --force`.
- It seeds: 8 `categories`, 4 `sellers`, 28 `products` (status `approved`),
  3 `coupons`, 3 `banners`, 5 `reviews`, `settings/general`.
- Demo users are NOT seeded — they are demo-mode only. Real sellers register
  in the app; their stores start `status: 'pending'` until an admin approves
  them, and their products start `status: 'pending'` until approved.
- `settings` — `commissionRate: 0.10`, `shippingDhaka: 60`,
  `shippingOutsideDhaka: 120`, `freeShippingAbove: 1500`.

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

- [ ] Rules re-published from the updated `firestore.rules` (§3)
- [ ] First admin created via the users-doc bootstrap (§5); demo accounts
      only work in Demo Mode (the login page hides them when Firebase is on)
- [ ] Catalogue seeded with `npm run seed:firestore` (§6)
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
