// SP Marketplace — Firebase Cloud Functions (firebase-functions v2).
// Privileged operations live here, NEVER in the frontend:
//  - setAdminClaim: only an existing admin (custom claim) can grant roles.
//  - createOrder: Firestore transaction — stock check + decrement, parent
//    order + per-seller sellerOrders, commission calc. Prevents overselling
//    and duplicate orders (idempotency key).
//  - verifyPayment: records a payment-verification attempt; NEVER trusts a
//    frontend "payment success" message. Real gateways (bKash/Nagad/card)
//    must call back here with a server-side signature check (see DEPLOYMENT.md).
//  - onOrderCreate: commission + notification records after an order lands.
//
// Deploy: `firebase deploy --only functions` (needs Blaze plan for outbound
// gateway calls). Requires firebase-admin service credentials — never put
// them in frontend code.
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()
const db = getFirestore()
const COMMISSION_RATE = 0.10

function requireAdmin(context) {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Only a Super Admin can do this.')
  }
}

// Grant / revoke admin or moderator custom claims. Callable only by an admin.
exports.setAdminClaim = onCall(async (request) => {
  requireAdmin(request)
  const { uid, role } = request.data || {}
  if (!uid || !['admin', 'moderator', 'seller', 'customer'].includes(role)) {
    throw new HttpsError('invalid-argument', 'uid and a valid role are required.')
  }
  const claims = { admin: role === 'admin', moderator: role === 'moderator' }
  await getAuth().setCustomUserClaims(uid, claims)
  await db.collection('users').doc(uid).set({ role, claimsUpdatedAt: FieldValue.serverTimestamp() }, { merge: true })
  await db.collection('auditLogs').add({
    actor: request.auth.uid, role: 'admin', action: `Set role ${role} for user ${uid}`,
    target: uid, createdAt: FieldValue.serverTimestamp(),
  })
  return { ok: true, uid, role }
})

// Create a multi-vendor order in a transaction.
exports.createOrder = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.')
  const { items, address, payment, coupon, idempotencyKey } = request.data || {}
  if (!Array.isArray(items) || items.length === 0) throw new HttpsError('invalid-argument', 'Cart is empty.')
  if (!idempotencyKey) throw new HttpsError('invalid-argument', 'idempotencyKey is required.')

  // Duplicate guard: same key can never create a second order.
  const existing = await db.collection('orders').where('idempotencyKey', '==', idempotencyKey).limit(1).get()
  if (!existing.empty) return { orderId: existing.docs[0].id, duplicate: true }

  const result = await db.runTransaction(async (tx) => {
    const bySeller = {}
    let subtotal = 0
    for (const item of items) {
      const ref = db.collection('products').doc(item.productId)
      const snap = await tx.get(ref)
      if (!snap.exists) throw new HttpsError('not-found', `Product not found: ${item.productId}`)
      const p = snap.data()
      if (p.status !== 'approved') throw new HttpsError('failed-precondition', `Product not approved: ${p.name}`)
      if ((p.stock || 0) < item.qty) throw new HttpsError('failed-precondition', `Only ${p.stock} left: ${p.name}`)
      tx.update(ref, { stock: (p.stock || 0) - item.qty, sold: (p.sold || 0) + item.qty })
      subtotal += p.price * item.qty
      const sid = p.sellerId
      bySeller[sid] = bySeller[sid] || { sellerId: sid, items: [], subtotal: 0 }
      bySeller[sid].items.push({ productId: item.productId, name: p.name, price: p.price, variant: item.variant || '', qty: item.qty, image: (p.images || [])[0] || '' })
      bySeller[sid].subtotal += p.price * item.qty
    }
    const discount = coupon ? Math.round(subtotal * (coupon.discountPercent / 100)) : 0
    const shipping = subtotal - discount >= 1500 ? 0 : (address.division === 'dhaka' ? 60 : 120)
    const total = subtotal - discount + shipping
    const orderRef = db.collection('orders').doc()
    const parent = {
      idempotencyKey, customerId: request.auth.uid, customerName: address.name,
      address, paymentMethod: payment.method, paymentStatus: payment.method === 'cod' ? 'unpaid' : 'pending_verification',
      txnId: payment.txnId || '', subtotal, discount, shipping, total, couponCode: coupon ? coupon.code : '',
      status: 'processing', createdAt: FieldValue.serverTimestamp(), sellerIds: Object.keys(bySeller),
    }
    tx.set(orderRef, parent)
    for (const g of Object.values(bySeller)) {
      const commission = Math.round(g.subtotal * COMMISSION_RATE)
      tx.set(db.collection('sellerOrders').doc(), {
        parentOrderId: orderRef.id, sellerId: g.sellerId, items: g.items,
        subtotal: g.subtotal, commission, sellerEarnings: g.subtotal - commission,
        status: 'processing', createdAt: FieldValue.serverTimestamp(),
      })
      tx.set(db.collection('commissions').doc(), {
        sellerId: g.sellerId, orderId: orderRef.id, amount: commission,
        rate: COMMISSION_RATE, createdAt: FieldValue.serverTimestamp(),
      })
    }
    // Payment record — NEVER store card numbers/CVV here.
    tx.set(db.collection('payments').doc(), {
      orderId: orderRef.id, customerId: request.auth.uid, method: payment.method,
      amount: total, txnId: payment.txnId || '', cardLast4: payment.cardLast4 || '',
      status: payment.method === 'cod' ? 'cod_pending' : 'awaiting_verification',
      createdAt: FieldValue.serverTimestamp(),
    })
    return { orderId: orderRef.id, total }
  })
  return { ...result, duplicate: false }
})

// Verify a payment attempt (bKash/Nagad/card callback). The gateway must send
// a server-side signature — a frontend "success" message is never accepted.
exports.verifyPayment = onCall(async (request) => {
  requireAdmin(request) // manual TrxID verification by admin/moderator in v1
  const { orderId, txnId, verified } = request.data || {}
  if (!orderId) throw new HttpsError('invalid-argument', 'orderId is required.')
  const ref = db.collection('orders').doc(orderId)
  const snap = await ref.get()
  if (!snap.exists) throw new HttpsError('not-found', 'Order not found.')
  await ref.update({ paymentStatus: verified ? 'paid' : 'failed', paymentVerifiedAt: FieldValue.serverTimestamp() })
  await db.collection('payments').where('orderId', '==', orderId).limit(1).get()
    .then((qs) => { if (!qs.empty) qs.docs[0].ref.update({ status: verified ? 'verified' : 'failed', txnId: txnId || '' }) })
  await db.collection('auditLogs').add({
    actor: request.auth.uid, role: 'admin', action: `Payment ${verified ? 'verified' : 'rejected'} for order ${orderId} (TrxID ${txnId || '-'})`,
    target: orderId, createdAt: FieldValue.serverTimestamp(),
  })
  return { ok: true, orderId, verified: !!verified }
})

// After an order is created: notify each seller (notification records).
exports.onOrderCreate = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data.data()
  const batch = db.batch()
  for (const sellerId of order.sellerIds || []) {
    batch.set(db.collection('notifications').doc(), {
      userId: sellerId, type: 'new_order', title: 'New order received',
      body: `Order ${event.params.orderId} — ৳${order.total}`,
      orderId: event.params.orderId, read: false, createdAt: FieldValue.serverTimestamp(),
    })
  }
  await batch.commit()
})
