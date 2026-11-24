// Data layer.
// Demo Mode (no Firebase keys in .env): localStorage collections seeded from
// src/data/demo.js — unchanged behaviour.
// Production (Firebase configured): Firestore is the source of truth, with a
// localStorage cache in front of it so every page keeps working with the same
// SYNCHRONOUS function signatures:
//
//   * On app start (and whenever the signed-in user changes),
//     syncFromFirestore() loads each collection once into the cache.
//   * Getters read the Firestore cache when it has been loaded; before the
//     first successful sync (or if Firestore is unreachable) they fall back
//     to the demo data + local cache, so the shop never renders blank.
//   * Every save/delete updates the cache immediately, then writes through
//     to Firestore in the background. A failed write never breaks the page —
//     it is recorded in the sync status (see getSyncStatus / SyncBanner) and
//     the cached data stays usable until the next successful sync.
//   * Orders: createOrder writes the parent order to `orders`, one doc per
//     seller to `sellerOrders`, and a payment record to `payments` — parent
//     first, so the sellerOrders security rule can verify its parent.
//
// Order creation follows the parent-child architecture: one parent order +
// one sellerOrder per seller, per-seller subtotal, shipping, 10% commission,
// separate seller earnings. Stock is checked at checkout to prevent overselling;
// the Cloud Function (functions/index.js) repeats the check in a transaction
// once Functions are deployed — until then the client-side check and the
// Firestore rules (firestore.rules) are the enforcement.
import { db, auth, isDemoMode } from './firebase'
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, deleteDoc, where } from 'firebase/firestore'
import { PRODUCTS, SELLERS, CATEGORIES, COUPONS, BANNERS, SETTINGS, DEMO_USERS } from '../data/demo'
import { uid, idempotencyKey } from './format'

const LS = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback }
}
const LS_SET = (key, val) => localStorage.setItem(key, JSON.stringify(val))

// --- Firestore cache keys (production mode) ---------------------------------
// A cached value of `null` means "never synced yet" (fall back to demo data);
// an empty array / object means "synced and genuinely empty".
const REMOTE = {
  products: 'sp_products_remote',
  sellers: 'sp_sellers_remote',
  categories: 'sp_categories_remote',
  coupons: 'sp_coupons_remote',
  banners: 'sp_banners_remote',
  settings: 'sp_settings_remote',
  users: 'sp_users_remote',
}

// --- Sync status ------------------------------------------------------------
// `errors` maps collection -> message for collections that failed to load.
// The UI banner (SyncBanner) shows only when a public catalogue collection
// (products/categories/coupons/banners/settings) failed, or a write failed —
// auth-gated collections (users, auditLogs, orders for visitors) failing is
// expected and stays in the console + this status object.
export const syncState = { status: 'idle', errors: {}, lastWriteError: null, lastSyncAt: null }
const PUBLIC_COLLECTIONS = ['products', 'categories', 'coupons', 'banners', 'settings']
const syncListeners = new Set()
export const subscribeSync = (fn) => { syncListeners.add(fn); return () => syncListeners.delete(fn) }
export const getSyncStatus = () => ({ ...syncState, errors: { ...syncState.errors } })
function emitSync() {
  const s = getSyncStatus()
  syncListeners.forEach((fn) => { try { fn(s) } catch { /* listener must never break sync */ } })
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sp:firestore-sync', { detail: s }))
}

const isLive = () => !isDemoMode && !!db

// Firestore rejects `undefined` values — strip them recursively.
const clean = (v) => {
  if (Array.isArray(v)) return v.map(clean)
  if (v && typeof v === 'object') {
    const out = {}
    for (const [k, val] of Object.entries(v)) if (val !== undefined) out[k] = clean(val)
    return out
  }
  return v
}

// Fire-and-forget write-through. Returns true on success. Failures are
// recorded (never thrown) so a denied/slow write can't break the page.
async function writeThrough(op, coll, docId, data) {
  if (!isLive()) return true
  try {
    if (op === 'set') await setDoc(doc(db, coll, docId), clean(data), { merge: true })
    else if (op === 'update') await updateDoc(doc(db, coll, docId), clean(data))
    else if (op === 'delete') await deleteDoc(doc(db, coll, docId))
    return true
  } catch (e) {
    console.warn(`[firestore] ${op} ${coll}/${docId} failed:`, e?.message || e)
    syncState.lastWriteError = { coll, docId, message: e?.message || String(e), at: new Date().toISOString() }
    emitSync()
    return false
  }
}

const mergeById = (fetched, local) => {
  const byId = new Map(fetched.map((d) => [d.id, d]))
  for (const d of local || []) if (d?.id && !byId.has(d.id)) byId.set(d.id, d)
  return [...byId.values()]
}

// --- One-time load of every collection into the cache -----------------------
let syncPromise = null
let lastSyncKey = null
export function syncFromFirestore({ force = false } = {}) {
  if (!isLive()) return Promise.resolve(getSyncStatus())
  const key = auth?.currentUser?.uid || 'anon'
  if (syncPromise) return syncPromise
  if (!force && lastSyncKey === key && syncState.status === 'ok') return Promise.resolve(getSyncStatus())
  syncState.status = 'syncing'
  syncState.errors = {}
  emitSync()
  syncPromise = (async () => {
    const errors = {}
    const loadList = async (coll, cacheKey, mergeKey, constraints = []) => {
      try {
        // The products rule only allows reads where status == 'approved', so
        // an unfiltered list query is rejected with permission-denied for
        // visitors. Filter the query to match the rule (Firestore requires
        // the query itself to guarantee every returned doc is readable).
        const ref = constraints.length ? query(collection(db, coll), ...constraints) : collection(db, coll)
        const snap = await getDocs(ref)
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        LS_SET(cacheKey, mergeKey ? mergeById(docs, LS(mergeKey, [])) : docs)
      } catch (e) {
        errors[coll] = e?.message || String(e)
        console.warn(`[firestore] sync ${coll} failed:`, e?.message || e)
      }
    }
    const loadSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'))
        LS_SET(REMOTE.settings, snap.exists() ? { id: snap.id, ...snap.data() } : {})
      } catch (e) {
        errors.settings = e?.message || String(e)
        console.warn('[firestore] sync settings failed:', e?.message || e)
      }
    }
    await Promise.all([
      loadList('products', REMOTE.products, undefined, [where('status', '==', 'approved')]),
      loadList('sellers', REMOTE.sellers),
      loadList('categories', REMOTE.categories),
      loadList('coupons', REMOTE.coupons),
      loadList('banners', REMOTE.banners),
      loadSettings(),
      // Merge with the local cache so an order/review placed a moment ago is
      // not dropped if the sync snapshot was taken before its write landed.
      loadList('orders', 'sp_orders', 'sp_orders'),
      loadList('sellerOrders', 'sp_seller_orders', 'sp_seller_orders'),
      loadList('reviews', 'sp_reviews', 'sp_reviews'),
      loadList('users', REMOTE.users),
      loadList('auditLogs', 'sp_audit', 'sp_audit'),
    ])
    syncState.errors = errors
    syncState.status = PUBLIC_COLLECTIONS.some((c) => errors[c]) ? 'error' : 'ok'
    syncState.lastSyncAt = new Date().toISOString()
    lastSyncKey = key
    emitSync()
    return getSyncStatus()
  })()
  const p = syncPromise
  p.finally(() => { if (syncPromise === p) syncPromise = null })
  return p
}

// --- Lookups (remote cache first, demo data as fallback) --------------------
export const getSeller = (id) => getSellers().find((s) => s.id === id)
export const getCategory = (slug) => getCategories().find((c) => c.slug === slug)
export const getProduct = (id, extra = []) => [...getProducts(), ...extra].find((p) => p.id === id)

export const getCategories = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.categories, null)
    if (remote !== null && remote.length > 0) return remote
  }
  return CATEGORIES
}

export const getSettings = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.settings, null)
    if (remote !== null) return { ...SETTINGS, ...remote, ...LS('sp_settings', {}) }
  }
  return { ...SETTINGS, ...(LS('sp_settings', {})) }
}
export const saveSettings = (patch) => {
  const s = { ...getSettings(), ...patch }
  LS_SET('sp_settings', s)
  if (!isDemoMode) writeThrough('set', 'settings', 'general', s)
  return s
}

export const getProducts = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.products, null)
    if (remote !== null) return remote
  }
  const extra = LS('sp_products_extra', [])
  const overrides = LS('sp_products_overrides', {})
  const base = PRODUCTS.map((p) => ({ ...p, ...(overrides[p.id] || {}) }))
  return [...base, ...extra]
}
export const saveProduct = (product) => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.products, [])
    const i = remote.findIndex((p) => p.id === product.id)
    LS_SET(REMOTE.products, i >= 0
      ? remote.map((p) => (p.id === product.id ? { ...p, ...product } : p))
      : [...remote, product])
    writeThrough('set', 'products', product.id, product)
    return product
  }
  const extra = LS('sp_products_extra', [])
  const overrides = LS('sp_products_overrides', {})
  if (PRODUCTS.some((p) => p.id === product.id)) { overrides[product.id] = product; LS_SET('sp_products_overrides', overrides) }
  else if (extra.some((p) => p.id === product.id)) { LS_SET('sp_products_extra', extra.map((p) => (p.id === product.id ? product : p))) }
  else LS_SET('sp_products_extra', [...extra, product])
  return product
}
export const deleteProduct = (id) => {
  if (!isDemoMode) {
    LS_SET(REMOTE.products, LS(REMOTE.products, []).filter((p) => p.id !== id))
    // Sellers cannot delete via the rules (admin only) — a denied write is
    // recorded in the sync status and the cached row is restored on next sync.
    writeThrough('delete', 'products', id)
    return
  }
  LS_SET('sp_products_extra', LS('sp_products_extra', []).filter((p) => p.id !== id))
  const o = LS('sp_products_overrides', {}); delete o[id]; LS_SET('sp_products_overrides', o)
  // Demo seed products are soft-deleted via a tombstone override.
  if (PRODUCTS.some((p) => p.id === id)) { const ov = LS('sp_products_overrides', {}); ov[id] = { deleted: true }; LS_SET('sp_products_overrides', ov) }
}
export const decrementStock = (productId, qty) => {
  const p = getProducts().find((x) => x.id === productId)
  if (!p) return
  saveProduct({ ...p, stock: Math.max(0, p.stock - qty), sold: (p.sold || 0) + qty })
}

export const getSellers = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.sellers, null)
    if (remote !== null) return remote
  }
  const extra = LS('sp_sellers_extra', [])
  const overrides = LS('sp_sellers_overrides', {})
  return [...SELLERS.map((s) => ({ ...s, ...(overrides[s.id] || {}) })), ...extra]
}
export const saveSeller = (seller) => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.sellers, [])
    const i = remote.findIndex((s) => s.id === seller.id)
    LS_SET(REMOTE.sellers, i >= 0
      ? remote.map((s) => (s.id === seller.id ? { ...s, ...seller } : s))
      : [...remote, seller])
    writeThrough('set', 'sellers', seller.id, seller)
    return seller
  }
  const extra = LS('sp_sellers_extra', [])
  const overrides = LS('sp_sellers_overrides', {})
  if (SELLERS.some((s) => s.id === seller.id)) { overrides[seller.id] = seller; LS_SET('sp_sellers_overrides', overrides) }
  else if (extra.some((s) => s.id === seller.id)) LS_SET('sp_sellers_extra', extra.map((s) => (s.id === seller.id ? seller : s)))
  else LS_SET('sp_sellers_extra', [...extra, seller])
  return seller
}

export const getCoupons = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.coupons, null)
    if (remote !== null) return remote
  }
  return [...COUPONS, ...LS('sp_coupons_extra', [])]
}
export const saveCoupon = (c) => {
  if (!isDemoMode) {
    LS_SET(REMOTE.coupons, [...LS(REMOTE.coupons, []).filter((x) => x.code !== c.code), c])
    writeThrough('set', 'coupons', c.code, c)
    return c
  }
  LS_SET('sp_coupons_extra', [...LS('sp_coupons_extra', []).filter((x) => x.code !== c.code), c]); return c
}
export const deleteCoupon = (code) => {
  if (!isDemoMode) {
    LS_SET(REMOTE.coupons, LS(REMOTE.coupons, []).filter((x) => x.code !== code))
    writeThrough('delete', 'coupons', code)
    return
  }
  LS_SET('sp_coupons_extra', LS('sp_coupons_extra', []).filter((x) => x.code !== code))
}
export const getBanners = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.banners, null)
    if (remote !== null) return remote
  }
  return [...BANNERS, ...LS('sp_banners_extra', [])]
}
export const saveBanner = (b) => {
  if (!isDemoMode) {
    LS_SET(REMOTE.banners, [...LS(REMOTE.banners, []).filter((x) => x.id !== b.id), b])
    writeThrough('set', 'banners', b.id, b)
    return b
  }
  LS_SET('sp_banners_extra', [...LS('sp_banners_extra', []).filter((x) => x.id !== b.id), b]); return b
}

export const getUsers = () => {
  if (!isDemoMode) {
    const remote = LS(REMOTE.users, null)
    if (remote !== null) return remote
  }
  return [...DEMO_USERS.map(({ password, ...u }) => u), ...LS('sp_users_extra', [])]
}
export const getReviews = (productId) => LS('sp_reviews', []).filter((r) => !productId || r.productId === productId)
export const addReview = (review) => {
  // The reviews rule requires userId == the signed-in user — attach it here
  // so pages don't have to know about Auth.
  const withUser = !isDemoMode && auth?.currentUser
    ? { ...review, userId: review.userId || auth.currentUser.uid }
    : review
  const all = [withUser, ...LS('sp_reviews', [])]
  LS_SET('sp_reviews', all)
  if (!isDemoMode) writeThrough('set', 'reviews', withUser.id, withUser)
  return withUser
}

// --- Orders: parent order + one sellerOrder per seller ----------------------
export const getOrders = () => LS('sp_orders', [])
export const getSellerOrders = () => LS('sp_seller_orders', [])
export const getOrderById = (id) => getOrders().find((o) => o.id === id)

export function createOrder({ customer, items, address, payment, coupon }) {
  // items: [{ product, variant, qty }]
  const settings = getSettings()
  // 1) Stock check — prevents overselling. Throws if any item is short.
  for (const it of items) {
    const p = getProducts().find((x) => x.id === it.product.id)
    if (!p || p.deleted) throw new Error(`Product unavailable: ${it.product.name}`)
    if (p.stock < it.qty) throw new Error(`Only ${p.stock} left in stock: ${p.name}`)
  }
  // 2) Idempotency: same key can never create a second order.
  const key = idempotencyKey()
  const parentId = uid('SP')
  const subtotal = items.reduce((s, it) => s + it.product.price * it.qty, 0)
  const discount = coupon ? Math.round(subtotal * (coupon.discountPercent / 100)) : 0
  const shipping = subtotal - discount >= settings.freeShippingAbove ? 0 : (address.division === 'dhaka' ? settings.shippingDhaka : settings.shippingOutsideDhaka)
  const total = subtotal - discount + shipping
  const bySeller = {}
  for (const it of items) {
    const sid = it.product.sellerId
    bySeller[sid] = bySeller[sid] || { sellerId: sid, items: [], subtotal: 0 }
    bySeller[sid].items.push({ productId: it.product.id, name: it.product.name, nameBn: it.product.nameBn, price: it.product.price, variant: it.variant, qty: it.qty, image: it.product.images[0] })
    bySeller[sid].subtotal += it.product.price * it.qty
  }
  const parent = {
    id: parentId, idempotencyKey: key, customerId: customer?.id || 'guest', customerName: customer?.name || address.name,
    customerEmail: customer?.email || '', address, paymentMethod: payment.method, paymentStatus: payment.method === 'cod' ? 'unpaid' : 'pending_verification',
    txnId: payment.txnId || '', subtotal, discount, shipping, total, couponCode: coupon?.code || '',
    status: 'processing', createdAt: new Date().toISOString(), sellerIds: Object.keys(bySeller),
  }
  const sellerOrders = Object.values(bySeller).map((g) => {
    const commission = Math.round(g.subtotal * settings.commissionRate)
    return {
      id: uid('SO'), parentOrderId: parentId, sellerId: g.sellerId, items: g.items,
      subtotal: g.subtotal, commission, sellerEarnings: g.subtotal - commission,
      status: 'processing', createdAt: parent.createdAt,
    }
  })
  // 3) Persist + decrement stock (in production this is a Firestore transaction
  // in functions/index.js — createOrder — never trust the client alone).
  LS_SET('sp_orders', [parent, ...getOrders()])
  LS_SET('sp_seller_orders', [...sellerOrders, ...getSellerOrders()])
  for (const it of items) decrementStock(it.product.id, it.qty)
  // 4) Payment record (never stores card numbers — only method + last4 + txn id).
  const paymentRecord = { id: uid('PAY'), orderId: parentId, customerId: parent.customerId, method: payment.method, amount: total, txnId: payment.txnId || '', cardLast4: payment.cardLast4 || '', status: payment.method === 'cod' ? 'cod_pending' : 'awaiting_verification', createdAt: parent.createdAt }
  const payments = LS('sp_payments', [])
  LS_SET('sp_payments', [paymentRecord, ...payments])
  // 5) Production: write the same documents to Firestore, parent first so the
  // sellerOrders rule can verify the parent order belongs to the caller.
  // Sequential awaits inside a background task; a failure is recorded in the
  // sync status and never thrown back to checkout.
  if (!isDemoMode) {
    ;(async () => {
      if (!(await writeThrough('set', 'orders', parent.id, parent))) return
      for (const so of sellerOrders) await writeThrough('set', 'sellerOrders', so.id, so)
      await writeThrough('set', 'payments', paymentRecord.id, paymentRecord)
    })()
  }
  return { parent, sellerOrders }
}

export const updateOrderStatus = (orderId, status, actor) => {
  const update = (list) => list.map((o) => (o.id === orderId ? { ...o, status } : o))
  LS_SET('sp_orders', update(getOrders()))
  LS_SET('sp_seller_orders', update(getSellerOrders()))
  if (!isDemoMode) {
    // Only write documents that exist in the cache — setDoc(merge) on a
    // missing id would create a partial document.
    const parent = getOrders().find((o) => o.id === orderId)
    if (parent) writeThrough('set', 'orders', parent.id, parent)
    for (const so of getSellerOrders().filter((o) => o.id === orderId || o.parentOrderId === orderId)) {
      writeThrough('set', 'sellerOrders', so.id, so)
    }
  }
  addAudit({ actor: actor?.name || 'system', role: actor?.role || '-', action: `Order ${orderId} → ${status}`, target: orderId })
}

// --- Audit log ---------------------------------------------------------------
// In production only admins/moderators may write auditLogs (see rules);
// other callers keep the entry in the local log only.
export const getAuditLogs = () => LS('sp_audit', [])
export const addAudit = (entry) => {
  const full = { id: uid('AUD'), createdAt: new Date().toISOString(), ...entry }
  LS_SET('sp_audit', [full, ...getAuditLogs()].slice(0, 500))
  if (!isDemoMode) writeThrough('set', 'auditLogs', full.id, full)
  return full
}

// --- Moderators (configurable limited permissions) ---------------------------
// Local-only by design: there is no `moderators` collection. Real moderator
// access comes from the `role: 'moderator'` field on the user's `users/{uid}`
// document (set in the console — see DEPLOYMENT.md §5). This list only holds
// the dashboard's per-moderator permission toggles.
export const getModerators = () => LS('sp_moderators', [
  { id: 'u-mod', name: 'Moderator Tanvir', email: 'moderator@sp.demo', canApproveProducts: true, canManageOrders: true, canManageCategories: true, canManageBanners: false, canManageCoupons: false },
])
export const saveModerator = (m) => { LS_SET('sp_moderators', [...getModerators().filter((x) => x.id !== m.id), m]); return m }
export const deleteModerator = (id) => LS_SET('sp_moderators', getModerators().filter((x) => x.id !== id))

export { db, auth, isDemoMode }
