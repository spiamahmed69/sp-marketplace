import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import { formatTaka } from '../lib/format'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { getSeller } from '../data/demo'
import ProductImage from './ProductImage'
import RatingStars from './RatingStars'

export default function ProductCard({ product }) {
  const { lang, t } = useLanguage()
  const { add } = useCart()
  const { toggle, has } = useWishlist()
  const toast = useToast()
  const seller = getSeller(product.sellerId)
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  const name = lang === 'bn' ? product.nameBn : product.name
  const wished = has(product.id)
  const handleAdd = (e) => {
    e.preventDefault()
    if (product.stock <= 0) return
    add(product, product.variants?.[0])
    toast.success(t('addedToCart'))
  }
  return (
    <article className="group relative flex flex-col rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
      <Link to={`/product/${product.id}`} className="block" aria-label={name}>
        <div className="relative aspect-square overflow-hidden bg-surface">
          <ProductImage src={product.images?.[0]} alt={name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {discount > 0 && <span className="absolute top-2 left-2 rounded-md bg-primary px-2 py-1 text-xs font-bold text-white">-{discount}%</span>}
          {product.flash && <span className="absolute top-2 right-12 rounded-md bg-red-600 px-2 py-1 text-xs font-bold text-white">FLASH</span>}
        </div>
      </Link>
      <button
        onClick={() => { toggle(product.id); toast.success(wished ? t('removedFromWishlist') : t('addedToWishlist')) }}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        aria-pressed={wished}
        className="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow hover:scale-105 transition"
      >
        <Heart className={`h-5 w-5 ${wished ? 'text-primary fill-primary' : 'text-gray-500'}`} />
      </button>
      <div className="flex flex-1 flex-col p-3">
        <Link to={`/product/${product.id}`} className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug hover:text-primary">{name}</Link>
        <div className="mt-1 flex items-center gap-2">
          <RatingStars rating={product.rating} />
          <span className="text-xs text-muted">({product.reviewCount})</span>
        </div>
        <p className="mt-1 text-xs text-muted truncate">{seller ? (lang === 'bn' ? seller.storeNameBn : seller.storeName) : ''} · {product.sold} {t('sold')}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-primary">{formatTaka(product.price)}</span>
          {product.oldPrice && <span className="text-sm text-muted line-through">{formatTaka(product.oldPrice)}</span>}
        </div>
        <button
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <ShoppingCart className="h-5 w-5" />
          {product.stock <= 0 ? t('outOfStock') : t('addToCart')}
        </button>
      </div>
    </article>
  )
}
