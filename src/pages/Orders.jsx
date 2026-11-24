import { Link, Navigate } from 'react-router-dom'
import { Package, MapPin } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getOrders } from '../lib/firestore'
import { formatTaka, timeAgo } from '../lib/format'
import SEO from '../components/SEO'
import { EmptyState } from '../components/States'

const STATUS_COLOR = { processing: 'bg-amber-100 text-amber-800', shipped: 'bg-sky-100 text-sky-800', delivered: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-800' }

export default function Orders() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const myOrders = getOrders().filter((o) => o.customerId === user.id || o.customerEmail === user.email || o.customerName === user.name)
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6">
      <SEO title={t('orders')} />
      <h1 className="text-2xl font-extrabold">{t('orders')} ({myOrders.length})</h1>
      {myOrders.length === 0 ? (
        <div className="mt-4"><EmptyState icon={Package} title={lang === 'bn' ? 'এখনো কোনো অর্ডার নেই' : 'No orders yet'} text={lang === 'bn' ? 'অর্ডার করলে এখানে দেখা যাবে।' : 'Your orders will appear here.'} action={<Link to="/products" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-white">{t('continueShopping')}</Link>} /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {myOrders.map((o) => (
            <article key={o.id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{t('orderId')}: {o.id}</p>
                  <p className="text-xs text-muted">{timeAgo(o.createdAt)} · {o.sellerIds?.length || 1} {lang === 'bn' ? 'সেলার' : 'seller(s)'} · {o.paymentMethod.toUpperCase()}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[o.status] || 'bg-gray-100'}`}>{t(o.status) || o.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-lg font-extrabold text-primary">{formatTaka(o.total)}</p>
                <Link to={`/track/${o.id}`} className="flex min-h-[44px] items-center gap-1 rounded-lg bg-primary px-4 font-semibold text-white"><MapPin className="h-4 w-4" />{t('trackOrder')}</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
