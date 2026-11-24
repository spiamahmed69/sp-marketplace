import { Link, Navigate } from 'react-router-dom'
import { Star } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { getReviews } from '../lib/firestore'
import { DEMO_REVIEWS } from '../data/demo'
import { getProduct } from '../lib/firestore'
import SEO from '../components/SEO'
import RatingStars from '../components/RatingStars'
import { EmptyState } from '../components/States'

export default function Reviews() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  const mine = [...getReviews().filter((r) => r.userName === user.name), ...DEMO_REVIEWS.filter((r) => r.userName === user.name)]
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6">
      <SEO title={t('myReviews')} />
      <h1 className="text-2xl font-extrabold">{t('myReviews')} ({mine.length})</h1>
      {mine.length === 0 ? (
        <div className="mt-4"><EmptyState icon={Star} title={lang === 'bn' ? 'আপনি এখনো কোনো রিভিউ দেননি' : 'You have not written any reviews yet'} action={<Link to="/products" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-white">{t('continueShopping')}</Link>} /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {mine.map((r) => {
            const p = getProduct(r.productId)
            return (
              <article key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex justify-between gap-2"><p className="font-bold">{p ? (lang === 'bn' ? p.nameBn : p.name) : r.productId}</p><span className="text-xs text-muted">{r.date}</span></div>
                <RatingStars rating={r.rating} />
                <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
                {p && <Link to={`/product/${p.id}`} className="mt-2 inline-block text-sm font-semibold text-primary">View product →</Link>}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
