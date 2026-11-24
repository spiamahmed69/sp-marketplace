import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Package, CheckCircle2, Truck, Box, Home, Search } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getOrderById, getSellerOrders } from '../lib/firestore'
import { formatTaka, timeAgo } from '../lib/format'
import SEO from '../components/SEO'
import { EmptyState } from '../components/States'

const STEPS = [
  { key: 'processing', icon: Box, labelBn: 'অর্ডার গৃহীত', labelEn: 'Order Placed' },
  { key: 'processing2', icon: Package, labelBn: 'প্রস্তুত হচ্ছে', labelEn: 'Preparing' },
  { key: 'shipped', icon: Truck, labelBn: 'পাঠানো হয়েছে', labelEn: 'Shipped' },
  { key: 'delivered', icon: Home, labelBn: 'ডেলিভার হয়েছে', labelEn: 'Delivered' },
]
const ORDER_INDEX = { processing: 1, shipped: 2, delivered: 3, cancelled: 0 }

export default function OrderTracking() {
  const { id } = useParams()
  const { t, lang } = useLanguage()
  const [searchId, setSearchId] = useState(id || '')
  const order = id ? getOrderById(id) : null
  const sellerOrders = order ? getSellerOrders().filter((so) => so.parentOrderId === order.id) : []
  const step = order ? ORDER_INDEX[order.status] ?? 1 : 0

  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6">
      <SEO title={t('tracking')} />
      <h1 className="text-2xl font-extrabold">{t('tracking')}</h1>
      <form onSubmit={(e) => { e.preventDefault(); if (searchId.trim()) window.location.hash = ''; window.location.pathname = `/track/${searchId.trim()}` }} className="mt-4 flex gap-2">
        <label htmlFor="track-id" className="sr-only">Order ID</label>
        <input id="track-id" value={searchId} onChange={(e) => setSearchId(e.target.value)} placeholder="SP_xxxxxxxx" className="h-11 flex-1 rounded-lg border px-3" />
        <button type="submit" className="flex min-h-[44px] items-center gap-1 rounded-lg bg-primary px-4 font-semibold text-white"><Search className="h-5 w-5" />{t('search')}</button>
      </form>

      {!order ? (
        <div className="mt-4"><EmptyState icon={Package} title={lang === 'bn' ? 'অর্ডার খুঁজে পাওয়া যায়নি' : 'Order not found'} text={lang === 'bn' ? 'সঠিক অর্ডার আইডি দিয়ে আবার চেষ্টা করুন।' : 'Check the order ID and try again.'} /></div>
      ) : (
        <div className="mt-6 rounded-xl border bg-white p-5">
          <div className="flex flex-wrap justify-between gap-2">
            <div><p className="font-bold">{t('orderId')}: {order.id}</p><p className="text-sm text-muted">{timeAgo(order.createdAt)} · {order.paymentMethod.toUpperCase()} · {order.paymentStatus}</p></div>
            <p className="text-xl font-extrabold text-primary">{formatTaka(order.total)}</p>
          </div>
          {order.status === 'cancelled' ? (
            <p className="mt-4 rounded-lg bg-red-50 p-3 font-semibold text-red-700" role="alert">{t('cancelled')}</p>
          ) : (
            <ol className="mt-6 space-y-0">
              {STEPS.map((s, i) => {
                const done = i < step
                const current = i === step
                return (
                  <li key={s.key} className="relative flex gap-3 pb-6 last:pb-0">
                    {i < STEPS.length - 1 && <span className={`absolute left-[19px] top-10 h-full w-0.5 ${done ? 'bg-success' : 'bg-gray-200'}`} aria-hidden="true" />}
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                    </span>
                    <span className="pt-2"><span className={`block font-bold ${current ? 'text-primary' : ''}`}>{lang === 'bn' ? s.labelBn : s.labelEn}</span><span className="block text-xs text-muted">{current ? (lang === 'bn' ? 'বর্তমান অবস্থা' : 'Current status') : done ? (lang === 'bn' ? 'সম্পন্ন' : 'Done') : (lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending')}</span></span>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="mt-6 border-t pt-4">
            <h2 className="font-bold">{lang === 'bn' ? 'সেলার অর্ডার' : 'Seller orders'} ({sellerOrders.length})</h2>
            {sellerOrders.map((so) => (
              <div key={so.id} className="mt-2 rounded-lg bg-surface p-3 text-sm">
                <p className="font-semibold">{so.id} · {t(so.status) || so.status}</p>
                <p className="text-muted">{so.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</p>
                <p>{t('subtotal')}: {formatTaka(so.subtotal)} · {t('commission')}: {formatTaka(so.commission)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted">
            <p>{t('deliveryAddress')}: {order.address?.address}, {order.address?.city}</p>
            <Link to="/orders" className="mt-2 inline-flex min-h-[44px] items-center font-semibold text-primary">{t('orders')} →</Link>
          </div>
        </div>
      )}
    </div>
  )
}
