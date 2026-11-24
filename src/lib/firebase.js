// Firebase initialisation — env-based, demo-mode aware.
// If no VITE_FIREBASE_API_KEY is set (or VITE_DEMO_MODE=true) the app runs in
// clearly-labelled Demo Mode on localStorage data. No credentials are ever
// invented here; real keys come from the user's own Firebase project (.env).
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
const forceDemo = import.meta.env.VITE_DEMO_MODE === 'true'
export const isDemoMode = !apiKey || forceDemo

let app = null
let auth = null
let db = null
let storage = null

if (!isDemoMode) {
  const config = {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  }
  app = initializeApp(config)
  auth = getAuth(app)
  db = getFirestore(app)
  storage = getStorage(app)
}

export { app, auth, db, storage }
export const COLLECTIONS = [
  'users', 'sellers', 'stores', 'products', 'categories', 'carts', 'wishlists',
  'orders', 'sellerOrders', 'payments', 'reviews', 'coupons', 'banners',
  'notifications', 'commissions', 'settings', 'auditLogs',
]
