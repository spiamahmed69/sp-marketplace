// One-time seed of the Firestore catalogue for SP Marketplace.
//
// Uploads the demo catalogue (src/data/demo.js) into Firestore so the live
// site has products, sellers, categories, coupons, banners, settings and
// sample reviews. Run ONCE, after:
//   1. The updated firestore.rules are published in the Firebase console.
//   2. A first admin exists (register in the live app, then set
//      users/{uid}.role = 'admin' in the console — see DEPLOYMENT.md §5).
//
// Usage (from the project root — never commit real values anywhere):
//   FIREBASE_SEED_EMAIL=you@example.com FIREBASE_SEED_PASSWORD='...' npm run seed:firestore
//   FIREBASE_SEED_EMAIL=you@example.com FIREBASE_SEED_PASSWORD='...' npm run seed:firestore -- --force
//
// Firebase web config is read from the environment (VITE_FIREBASE_*) or from
// a local .env file (same file the app uses). The seed account's email and
// password come ONLY from FIREBASE_SEED_EMAIL / FIREBASE_SEED_PASSWORD env
// vars — never hardcoded, never committed. Without --force the script refuses
// to run when the products collection is not empty. Demo users are NOT
// seeded: they are demo-mode only and have no real Auth accounts.
//
// Requires: node >= 18. Uses the Firebase client SDK (already a dependency).
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, doc, getDoc, getDocs, query, limit, writeBatch } from 'firebase/firestore'
import { PRODUCTS, SELLERS, CATEGORIES, COUPONS, BANNERS, SETTINGS, DEMO_REVIEWS } from '../src/data/demo.js'

const root = dirname(fileURLToPath(import.meta.url))

// Minimal .env reader (no extra dependency). Real environment variables win.
function loadDotEnv() {
  const envPath = join(root, '..', '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const [key, ...rest] = trimmed.split('=')
    const value = rest.join('=').trim().replace(/^['"]|['"]$/g, '')
    if (!(key.trim() in process.env)) process.env[key.trim()] = value
  }
}
loadDotEnv()

const force = process.argv.includes('--force')
const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'FIREBASE_SEED_EMAIL', 'FIREBASE_SEED_PASSWORD']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  console.error('Set them in .env or export them before running. See DEPLOYMENT.md §6.')
  process.exit(1)
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID,
})
const auth = getAuth(app)
const db = getFirestore(app)

const main = async () => {
  const cred = await signInWithEmailAndPassword(auth, process.env.FIREBASE_SEED_EMAIL, process.env.FIREBASE_SEED_PASSWORD)
  const uid = cred.user.uid
  // The seed account must be an admin, otherwise the writes are denied by
  // the security rules (and fail halfway through).
  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists() || userSnap.data().role !== 'admin') {
    console.error(`Seed account ${process.env.FIREBASE_SEED_EMAIL} is not an admin (users/${uid} role is not 'admin').`)
    console.error('Register in the live app, set role = admin in the Firebase console (DEPLOYMENT.md §5), then re-run.')
    process.exit(1)
  }
  console.log(`Signed in as admin ${process.env.FIREBASE_SEED_EMAIL}.`)

  if (!force) {
    const existing = await getDocs(query(collection(db, 'products'), limit(1)))
    if (!existing.empty) {
      console.log('products collection is not empty — nothing seeded. Re-run with --force to overwrite.')
      process.exit(0)
    }
  }

  const batch = writeBatch(db)
  let counts = { categories: 0, sellers: 0, products: 0, coupons: 0, banners: 0, reviews: 0, settings: 0 }

  for (const c of CATEGORIES) {
    batch.set(doc(db, 'categories', c.slug), { ...c })
    counts.categories++
  }
  for (const s of SELLERS) {
    // Seeded demo stores have no real owner — ownerId is intentionally left
    // out; only an admin can edit them until a real seller claims the store.
    batch.set(doc(db, 'sellers', s.id), { ...s })
    counts.sellers++
  }
  for (const p of PRODUCTS) {
    batch.set(doc(db, 'products', p.id), { ...p, status: 'approved' })
    counts.products++
  }
  for (const c of COUPONS) {
    batch.set(doc(db, 'coupons', c.code), { ...c })
    counts.coupons++
  }
  for (const b of BANNERS) {
    batch.set(doc(db, 'banners', b.id), { ...b })
    counts.banners++
  }
  for (const r of DEMO_REVIEWS) {
    batch.set(doc(db, 'reviews', r.id), { ...r, userId: 'seed' })
    counts.reviews++
  }
  batch.set(doc(db, 'settings', 'general'), { ...SETTINGS })
  counts.settings++

  await batch.commit()
  console.log('Seed complete:', JSON.stringify(counts))
  console.log('Verify in the Firebase console (Firestore) and on the live site, then delete this run from your shell history if it contains the password.')
  process.exit(0)
}

main().catch((e) => {
  console.error('Seed failed:', e?.message || e)
  process.exit(1)
})
