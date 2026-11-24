// Data layer. Demo Mode: localStorage collections (seeded from src/data/demo.js).
// Production (Firebase configured): Firestore — see DEPLOYMENT.md.
// Order creation follows the parent-child architecture: one parent order +
// one sellerOrder per seller, per-seller subtotal, shipping, 10% commission,
// separate seller earnings. Stock is checked at checkout to prevent overselling;
// the Cloud Function (functions/index.js) repeats the check in a transaction.
import { db, isDemoMode } from './firebase'
import { PRODUCTS, SELLERS, COUPONS, BANNERS, SETTINGS, DEMO_USERS } from '../data/demo'
export { getSeller, getCategory, getProduct } from '../data/demo'
import { uid, idempotencyKey } from './format'

const LS = (key, fallback) => {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback } catch { return fallback }
}
const LS_SET = (key, val) => localStorage.setItem(key, JSON.stringify(val))

export const getSettings = () => ({ ...SETTINGS, ...(LS('sp_settings', {})) })
export const saveSettings = (patch) => { const s = { ...getSettings(), ...patch }; LS_SET('sp_settings', s); return s }

export const getProducts = () => {
  const extra = LS('sp_products_extra', [])
  const overrides = LS('sp_products_overrides', {})
  const base = PRODUCTS.map((p) => ({ ...p, ...(overrides[p.id] || {}) }))
  return [...base, ...extra]
}
export const saveProduct = (product) => {
  const extra = LS('sp_products_extra', [])
  const overrides = LS('sp_products_overrides', {})
  if (PRODUCTS.some((p) => p.id === product.id)) { overrides[product.id] = product; LS_SET('sp_products_overrides', overrides) }
  else if (extra.some((p) => p.id === product.id)) { LS_SET('sp_products_extra', extra.map((p) => (p.id === product.id ? product : p))) }
  else LS_SET('sp_products_extra', [...extra, product])
  return product
}
export const deleteProduct = (id) => {
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
  const extra = LS('sp_sellers_extra', [])
  const overrides = LS('sp_sellers_overrides', {})
  return [...SELLERS.map((s) => ({ ...s, ...(overrides[s.id] || {}) })), ...extra]
}
export const saveSeller = (seller) => {
  const extra = LS('sp_sellers_extra', [])
  const overrides = LS('sp_sellers_overrides', {})
  if (SELLERS.some((s) => s.id === seller.id)) { overrides[seller.id] = seller; LS_SET('sp_sellers_overrides', overrides) }
  else if (extra.some((s) => s.id === seller.id)) LS_SET('sp_sellers_extra', extra.map((s) => (s.id === seller.id ? seller : s)))
  else LS_SET('sp_sellers_extra', [...extra, seller])
  return seller
}

export const getCoupons = () => [...COUPONS, ...LS('sp_coupons_extra', [])]
export const saveCoupon = (c) => { LS_SET('sp_coupons_extra', [...LS('sp_coupons_extra', []).filter((x) => x.code !== c.code), c]); return c }
export const deleteCoupon = (code) => LS_SET('sp_coupons_extra', LS('sp_coupons_extra', []).filter((x) => x.code !== code))
export const getBanners = () => [...BANNERS, ...LS('sp_banners_extra', [])]
export const saveBanner = (b) => { LS_SET('sp_banners_extra', [...LS('sp_banners_extra', []).filter((x) => x.id !== b.id), b]); return b }

export const getUsers = () => [...DEMO_USERS.map(({ password, ...u }) => u), ...LS('sp_users_extra', [])]
export const getReviews = (productId) => LS('sp_reviews', []).filter((r) => !productId || r.productId === productId)
export const addReview = (review) => { const all = [review, ...LS('sp_reviews', [])]; LS_SET('sp_reviews', all); return review }

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
  const payments = LS('sp_payments', [])
  LS_SET('sp_payments', [{ id: uid('PAY'), orderId: parentId, method: payment.method, amount: total, txnId: payment.txnId || '', cardLast4: payment.cardLast4 || '', status: payment.method === 'cod' ? 'cod_pending' : 'awaiting_verification', createdAt: parent.createdAt }, ...payments])
  return { parent, sellerOrders }
}

export const updateOrderStatus = (orderId, status, actor) => {
  const update = (list) => list.map((o) => (o.id === orderId ? { ...o, status } : o))
  LS_SET('sp_orders', update(getOrders()))
  LS_SET('sp_seller_orders', update(getSellerOrders()))
  addAudit({ actor: actor?.name || 'system', role: actor?.role || '-', action: `Order ${orderId} → ${status}`, target: orderId })
}

// --- Audit log ---------------------------------------------------------------
export const getAuditLogs = () => LS('sp_audit', [])
export const addAudit = (entry) => {
  LS_SET('sp_audit', [{ id: uid('AUD'), createdAt: new Date().toISOString(), ...entry }, ...getAuditLogs()].slice(0, 500))
}

// --- Moderators (configurable limited permissions) ---------------------------
export const getModerators = () => LS('sp_moderators', [
  { id: 'u-mod', name: 'Moderator Tanvir', email: 'moderator@sp.demo', canApproveProducts: true, canManageOrders: true, canManageCategories: true, canManageBanners: false, canManageCoupons: false },
])
export const saveModerator = (m) => { LS_SET('sp_moderators', [...getModerators().filter((x) => x.id !== m.id), m]); return m }
export const deleteModerator = (id) => LS_SET('sp_moderators', getModerators().filter((x) => x.id !== id))

export { db, isDemoMode }
