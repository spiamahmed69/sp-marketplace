import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, ShoppingCart, Zap, Truck, ShieldCheck, RotateCcw, Store, Star } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { getProducts, getSeller, getReviews, addReview, getCategory } from '../lib/firestore'
import { DEMO_REVIEWS } from '../data/demo'
import { formatTaka } from '../lib/format'
import SEO from '../components/SEO'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import RatingStars from '../components/RatingStars'
import { EmptyState } from '../components/States'

export default function ProductDetails() {
  const { id } = useParams()
  const { lang, t } = useLanguage()
  const { add } = useCart()
  const { toggle, has } = useWishlist()
  const toast = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const product = getProducts().find((p) => p.id === id && !p.deleted)
  const [img, setImg] = useState(0)
  const [variant, setVariant] = useState('')
  const [qty, setQty] = useState(1)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [localReviews, setLocalReviews] = useState(() => getReviews(id))

  const reviews = useMemo(() => [...localReviews, ...DEMO_REVIEWS.filter((r) => r.productId === id)], [localReviews, id])
  const related = useMemo(() => product ? getProducts().filter((p) => p.category === product.category && p.id !== product.id && p.status === 'approved' && !p.deleted).slice(0, 4) : [], [product])

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <EmptyState icon={Store} title={t('noProducts')} text={t('noProductsText')} action={<Link to="/products" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-white">{t('continueShopping')}</Link>} />
      </div>
    )
  }
  const seller = getSeller(product.sellerId)
  const category = getCategory(product.category)
  const name = lang === 'bn' ? product.nameBn : product.name
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  const wished = has(product.id)
  const variants = product.variants || []
  const chosen = variant || variants[0] || ''

  const handleAdd = () => {
    if (product.stock <= 0) return
    add(product, chosen, qty)
    toast.success(t('addedToCart'))
  }
  const handleBuy = () => { handleAdd(); navigate('/cart') }
  const submitReview = (e) => {
    e.preventDefault()
    if (!user) { toast.error(t('loginRequired')); navigate('/login'); return }
    if (!comment.trim()) return
    const r = { id: 'r_' + Date.now(), productId: id, userName: user.name, rating, comment: comment.trim(), date: new Date().toISOString().slice(0, 10) }
    addReview(r)
    setLocalReviews((prev) => [r, ...prev])
    setComment('')
    toast.success(lang === 'bn' ? 'রিভিউ জমা হয়েছে!' : 'Review submitted!')
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={name} description={product.description} product={product} image={product.images?.[0]} />
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">{t('home')}</Link> {' / '}
        <Link to={`/category/${product.category}`} className="hover:text-primary">{category ? (lang === 'bn' ? category.nameBn : category.name) : ''}</Link> {' / '}
        <span className="text-ink font-semibold">{name}</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-2xl border bg-surface aspect-square">
            <ProductImage src={product.images?.[img]} alt={name} eager className="h-full w-full object-cover" />
          </div>
          <div className="mt-3 flex gap-2">
            {product.images?.map((src, i) => (
              <button key={i} onClick={() => setImg(i)} aria-label={`View image ${i + 1}`} className={`h-20 w-20 overflow-hidden rounded-lg border-2 ${img === i ? 'border-primary' : 'border-gray-200'}`}>
                <ProductImage src={src} alt={`${name} thumbnail ${i + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <RatingStars rating={product.rating} />
            <span className="text-muted">({product.reviewCount} {t('reviews')})</span>
            <span className="text-muted">·</span>
            <span>{product.sold} {t('sold')}</span>
            <span className={`font-semibold ${product.stock > 0 ? 'text-success' : 'text-danger'}`}>{product.stock > 0 ? `${t('inStock')} (${product.stock} ${t('stockLeft')})` : t('outOfStock')}</span>
          </div>
          {product.stock > 0 && product.stock <= 10 && <p className="mt-2 inline-block rounded-md bg-red-50 px-2 py-1 text-sm font-semibold text-red-700">{t('hurry')}</p>}
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-primary">{formatTaka(product.price)}</span>
            {product.oldPrice && <><span className="text-lg text-muted line-through">{formatTaka(product.oldPrice)}</span><span className="rounded-md bg-primary px-2 py-1 text-sm font-bold text-white">-{discount}%</span></>}
          </div>
          <p className="mt-4 text-gray-700 leading-relaxed">{lang === 'bn' ? product.descriptionBn : product.description}</p>

          {variants.length > 0 && (
            <div className="mt-5">
              <p className="font-semibold">{t('selectVariant')}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Variants">
                {variants.map((v) => (
                  <button key={v} onClick={() => setVariant(v)} aria-pressed={chosen === v} className={`min-h-[44px] rounded-lg border px-4 font-medium ${chosen === v ? 'border-primary bg-primary-light text-primary' : 'border-gray-300 hover:border-primary'}`}>{v}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <label className="font-semibold" htmlFor="qty">{t('quantity')}</label>
            <div className="flex items-center rounded-lg border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity" className="flex h-11 w-11 items-center justify-center text-xl font-bold">−</button>
              <input id="qty" type="number" min="1" max={product.stock} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))} className="h-11 w-14 border-x text-center focus:outline-none" aria-label="Quantity" />
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))} aria-label="Increase quantity" className="flex h-11 w-11 items-center justify-center text-xl font-bold">+</button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button onClick={handleAdd} disabled={product.stock <= 0} className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg border-2 border-primary font-bold text-primary hover:bg-primary-light disabled:opacity-50">
              <ShoppingCart className="h-5 w-5" />{t('addToCart')}
            </button>
            <button onClick={handleBuy} disabled={product.stock <= 0} className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-50">
              <Zap className="h-5 w-5" />{t('buyNow')}
            </button>
            <button onClick={() => { toggle(product.id); toast.success(wished ? t('removedFromWishlist') : t('addedToWishlist')) }} aria-label="Toggle wishlist" aria-pressed={wished} className="flex min-h-[48px] w-full sm:w-14 items-center justify-center rounded-lg border hover:border-primary">
              <Heart className={`h-6 w-6 ${wished ? 'text-primary fill-primary' : 'text-gray-500'}`} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-surface p-3"><Truck className="h-5 w-5 mx-auto text-primary" /><p className="mt-1 font-semibold">{t('freeDelivery')}</p></div>
            <div className="rounded-lg bg-surface p-3"><ShieldCheck className="h-5 w-5 mx-auto text-primary" /><p className="mt-1 font-semibold">{t('codFull')}</p></div>
            <div className="rounded-lg bg-surface p-3"><RotateCcw className="h-5 w-5 mx-auto text-primary" /><p className="mt-1 font-semibold">7-day returns</p></div>
          </div>

          {seller && (
            <Link to={`/products?seller=${seller.id}`} className="mt-4 flex items-center gap-3 rounded-xl border p-3 hover:border-primary">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-xl font-extrabold text-primary">{seller.storeName[0]}</span>
              <span className="flex-1">
                <span className="block font-bold">{lang === 'bn' ? seller.storeNameBn : seller.storeName} {seller.verified && <span className="text-xs text-success">✓ {t('verified')}</span>}</span>
                <span className="block text-xs text-muted">★ {seller.rating} · {seller.products} {lang === 'bn' ? 'পণ্য' : 'products'}</span>
              </span>
              <span className="text-sm font-semibold text-primary">Visit store →</span>
            </Link>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-10" aria-label={t('customerReviews')}>
        <h2 className="text-xl font-extrabold">{t('customerReviews')} ({reviews.length})</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            {reviews.length === 0 && <EmptyState icon={Star} title={lang === 'bn' ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet'} />}
            {reviews.map((r) => (
              <article key={r.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between"><p className="font-bold">{r.userName}</p><span className="text-xs text-muted">{r.date}</span></div>
                <RatingStars rating={r.rating} />
                <p className="mt-2 text-sm text-gray-700">{r.comment}</p>
              </article>
            ))}
          </div>
          <form onSubmit={submitReview} className="h-fit rounded-xl border bg-white p-4">
            <h3 className="font-bold">{t('writeReview')}</h3>
            <label className="mt-3 block text-sm font-medium" htmlFor="review-rating">{t('rating')}</label>
            <select id="review-rating" value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 h-11 w-full rounded-lg border px-2">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
            </select>
            <label className="mt-3 block text-sm font-medium" htmlFor="review-comment">{t('message')}</label>
            <textarea id="review-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border p-2" placeholder={lang === 'bn' ? 'আপনার অভিজ্ঞতা লিখুন…' : 'Share your experience…'} />
            <button type="submit" className="mt-3 min-h-[44px] w-full rounded-lg bg-primary font-semibold text-white hover:bg-primary-dark">{t('submit')}</button>
            {!user && <p className="mt-2 text-xs text-muted">{t('loginRequired')}</p>}
          </form>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10" aria-label={t('relatedProducts')}>
          <h2 className="text-xl font-extrabold">{t('relatedProducts')}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  )
}
