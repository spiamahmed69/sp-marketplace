# SP Marketplace

A complete, production-oriented **multi-vendor e-commerce marketplace for Bangladesh** — React + Vite + Tailwind CSS + Firebase (Auth, Firestore, Storage) + Cloud Functions. Bengali (default) + English, BDT (৳), mobile-first.

> **Demo Mode:** if no Firebase keys are set in `.env`, the app runs on clearly-labelled demo data (see `src/data/demo.js`) with localStorage accounts. Demo only — no real payment is processed. See [DEPLOYMENT.md](DEPLOYMENT.md) to go live.

## Demo accounts (Demo Mode only)

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@sp.demo | admin123 |
| Moderator | moderator@sp.demo | mod123 |
| Seller (TechZone BD) | seller@sp.demo | seller123 |
| Customer | customer@sp.demo | customer123 |

## Quick start

```bash
npm install
cp .env.example .env   # add your Firebase keys to go live (optional — demo works without)
npm run dev            # http://localhost:5173
npm run build          # production build
npm run preview        # serve the production build
```

## What is built

- **Customer site** — Home (hero carousel, flash sale with countdown, trending, best sellers, recommended, featured stores, promo sections, newsletter), All Products (filters / sort / pagination), Category, Product Details (gallery, variants, reviews), Search, Cart (per-seller grouping), Checkout (Zod-validated address form, COD / bKash / Nagad / Card), Wishlist, Login / Register, Profile, My Orders, Order Tracking (timeline), Reviews, Contact, About, FAQ, Privacy, Terms.
- **Seller dashboard** (`/seller`) — store creation & verification status, product CRUD with image upload + variants + stock (products start **pending** until admin approval), own orders only, sales analytics (Recharts), earnings + 10% commission report, reviews, coupons, store settings (logo/banner upload).
- **Admin dashboard** (`/admin`) — overview analytics, seller approval, product approval, category/order/customer management, commissions, payments, coupons, banners, moderator management, website settings (commission rate, shipping rates), reports (CSV download), audit log.
- **Moderators** — configurable limited permissions: they can approve products and manage orders/categories, but **not** moderators, settings or commissions.
- **Multi-vendor orders** — checkout creates ONE parent order + one `sellerOrder` per seller, with per-seller subtotals, shipping (৳60 Dhaka / ৳120 outside, free above ৳1,500), 10% commission and separate seller earnings. Stock is checked at checkout and decremented on order; the Place Order button is disabled while submitting and an idempotency key prevents duplicate orders. In production the same logic runs in a Firestore transaction in `functions/index.js` (`createOrder`).
- **Payments** — COD, bKash, Nagad (TrxID entered for manual verification) and Card (gateway-ready form). **Card numbers are never stored** — only the last 4 digits are recorded. Frontend "payment success" is never trusted; verification happens server-side (`verifyPayment`).
- **Design** — primary `#F85606`, Hind Siliguri (Bengali) + Inter (English), Lucide icons only, 44px touch targets, 4.5:1 contrast, visible focus rings, loading skeletons, empty/error states, toasts, mobile bottom navigation. UI pattern: Feature-Rich Showcase (hero + features + CTA) per the UI/UX Pro Max skill (e-commerce → Vibrant & Block-based).

## Security — read this

- **Never trust a frontend role value for admin rights.** Real admin privileges come from Firebase Admin SDK **custom claims** set by the `setAdminClaim` Cloud Function. Demo-mode roles are demo-only.
- `firestore.rules` / `storage.rules` enforce role + ownership checks; there is no `allow read, write: if true` anywhere.
- Test rules with the Firebase Emulator Suite before deploying (see DEPLOYMENT.md).

## Project structure

```
src/
  main.jsx, App.jsx, index.css          # entry, lazy routes, design tokens
  lib/ firebase.js firestore.js i18n.js format.js
  data/ demo.js                          # DEMO data only (28 products, 4 stores, 8 categories)
  context/ AuthContext.jsx CartContext.jsx WishlistContext.jsx LanguageContext.jsx ToastContext.jsx
  components/ Navbar.jsx Footer.jsx ProductCard.jsx ProductImage.jsx SEO.jsx ...
  pages/ Home.jsx Products.jsx ProductDetails.jsx Cart.jsx Checkout.jsx ...
  pages/seller/ SellerDashboard.jsx
  pages/admin/ AdminDashboard.jsx
firestore.rules  storage.rules  firestore.indexes.json  firebase.json
functions/ index.js package.json        # Cloud Functions (v2)
public/ robots.txt sitemap.xml
```

## SEO / performance

Semantic HTML, lazy images, code splitting (lazy routes), per-page title/meta/OG via the `SEO` component, Product JSON-LD on product pages, `sitemap.xml` + `robots.txt`. This is a Vite SPA: product pages get meta tags through the SEO component at runtime. Full SSR/prerendering is a documented follow-up — it is **not** claimed to exist here.

## Testing

1. Login as customer (`customer@sp.demo` / `customer123`), add products from 2 different sellers to the cart, apply coupon `SP10`, check out with COD — verify one parent order + 2 seller orders appear in My Orders and in the seller dashboard.
2. Login as seller, add a product — it appears as **pending**; login as admin, approve it in Product Approval — it then appears in the shop.
3. Login as moderator — confirm the Moderators / Settings / Commissions tabs are absent.
4. Try checkout with an out-of-stock quantity and with the same order submitted twice — stock is enforced and no duplicate order is created.
5. Firebase: follow [DEPLOYMENT.md](DEPLOYMENT.md) to connect a real project, then repeat step 1 against Firestore.
