import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useWishlist } from '../context/WishlistContext'
import { getProducts } from '../lib/firestore'
import SEO from '../components/SEO'
import ProductCard from '../components/ProductCard'
import { EmptyState } from '../components/States'

export default function Wishlist() {
  const { t } = useLanguage()
  const { ids } = useWishlist()
  const products = getProducts().filter((p) => ids.includes(p.id) && !p.deleted && p.status === 'approved')
  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={t('wishlist')} />
      <h1 className="text-2xl font-extrabold">{t('wishlist')} ({products.length})</h1>
      {products.length === 0 ? (
        <div className="mt-4"><EmptyState icon={Heart} title={t('emptyWishlist')} text={t('emptyWishlistText')} action={<Link to="/products" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-white">{t('continueShopping')}</Link>} /></div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </div>
  )
}
