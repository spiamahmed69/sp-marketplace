import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Minus, Plus, ShoppingCart, Tag } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { getProducts, getCoupons, getSettings, getSeller } from '../lib/firestore'
import { formatTaka } from '../lib/format'
import SEO from '../components/SEO'
import ProductImage from '../components/ProductImage'
import { EmptyState } from '../components/States'
import { useState } from 'react'

export default function Cart() {
  const { lang, t } = useLanguage()
  const { items, setQty, remove, clear } = useCart()
  const toast = useToast()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const settings = getSettings()

  const detailed = items.map((it) => ({ ...it, product: getProducts().find((p) => p.id === it.productId) })).filter((it) => it.product && !it.product.deleted)
  const subtotal = detailed.reduce((s, it) => s + it.product.price * it.qty, 0)
  const discount = coupon ? Math.round(subtotal * (coupon.discountPercent / 100)) : 0
  const shipping = subtotal === 0 ? 0 : (subtotal - discount >= settings.freeShippingAbove ? 0 : settings.shippingDhaka)
  const total = subtotal - discount + shipping

  // Group items per seller (multi-vendor preview)
  const bySeller = {}
  for (const it of detailed) {
    const sid = it.product.sellerId
    bySeller[sid] = bySeller[sid] || []
    bySeller[sid].push(it)
  }

  const applyCoupon = () => {
    const found = getCoupons().find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active)
    if (!found || subtotal < found.minOrder) { toast.error(t('invalidCoupon')); return }
    setCoupon(found)
    toast.success(t('couponApplied'))
  }

  if (detailed.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <SEO title={t('cart')} />
        <EmptyState icon={ShoppingCart} title={t('emptyCart')} text={t('emptyCartText')} action={<Link to="/products" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-white">{t('continueShopping')}</Link>} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={t('cart')} />
      <h1 className="text-2xl font-extrabold">{t('cart')} ({detailed.length})</h1>
      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(bySeller).map(([sid, group]) => {
            const seller = getSeller(sid)
            return (
              <section key={sid} className="rounded-xl border bg-white overflow-hidden" aria-label={seller?.storeName}>
                <header className="bg-surface px-4 py-2.5 text-sm font-bold">
                  {lang === 'bn' ? seller?.storeNameBn : seller?.storeName} · {lang === 'bn' ? 'ডেলিভারি' : 'Delivery'} {formatTaka(settings.shippingDhaka)}
                </header>
                {group.map((it) => (
                  <div key={it.key} className="flex flex-wrap gap-x-3 gap-y-2 border-t p-3">
                    <Link to={`/product/${it.product.id}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface sm:h-24 sm:w-24">
                      <ProductImage src={it.product.images?.[0]} alt={it.product.name} className="h-full w-full object-cover" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${it.product.id}`} className="line-clamp-2 font-medium hover:text-primary">{lang === 'bn' ? it.product.nameBn : it.product.name}</Link>
                      {it.variant && <p className="text-xs text-muted mt-0.5">{it.variant}</p>}
                      <p className="mt-1 font-bold text-primary">{formatTaka(it.product.price)}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <div className="flex items-center rounded-lg border">
                          <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Decrease quantity" className="flex h-11 w-11 items-center justify-center"><Minus className="h-4 w-4" /></button>
                          <span className="w-8 text-center font-semibold" aria-label="Quantity">{it.qty}</span>
                          <button onClick={() => setQty(it.key, Math.min(it.product.stock, it.qty + 1))} aria-label="Increase quantity" className="flex h-11 w-11 items-center justify-center"><Plus className="h-4 w-4" /></button>
                        </div>
                        <button onClick={() => { remove(it.key); toast.info(lang === 'bn' ? 'পণ্য সরানো হয়েছে' : 'Item removed') }} className="flex min-h-[44px] shrink-0 items-center gap-1 text-sm text-red-600 hover:underline" aria-label="Remove item"><Trash2 className="h-4 w-4" />{t('delete')}</button>
                      </div>
                    </div>
                    <p className="w-full text-right font-bold whitespace-nowrap sm:w-auto">{formatTaka(it.product.price * it.qty)}</p>
                  </div>
                ))}
              </section>
            )
          })}
          <button onClick={() => { clear(); toast.info(lang === 'bn' ? 'কার্ট খালি করা হয়েছে' : 'Cart cleared') }} className="text-sm text-red-600 hover:underline min-h-[44px]">{lang === 'bn' ? 'কার্ট খালি করুন' : 'Clear cart'}</button>
        </div>

        <aside className="h-fit rounded-xl border bg-white p-4 lg:sticky lg:top-24">
          <h2 className="font-bold text-lg">{t('orderSummary')}</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>{t('subtotal')}</span><span className="font-semibold">{formatTaka(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-success"><span>{t('discount')} ({coupon.code})</span><span>−{formatTaka(discount)}</span></div>}
            <div className="flex justify-between"><span>{t('shipping')}</span><span className="font-semibold">{shipping === 0 ? (lang === 'bn' ? 'ফ্রি' : 'FREE') : formatTaka(shipping)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold"><span>{t('total')}</span><span className="text-primary">{formatTaka(total)}</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            <label htmlFor="coupon" className="sr-only">Coupon code</label>
            <input id="coupon" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="SP10" className="h-11 min-w-0 flex-1 rounded-lg border px-3 uppercase" />
            <button onClick={applyCoupon} className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg bg-ink px-3 font-semibold whitespace-nowrap text-white sm:px-4"><Tag className="h-4 w-4" />{t('applyCoupon')}</button>
          </div>
          <p className="mt-2 text-xs text-muted">Try: SP10 (10% off over ৳1,000) · WELCOME50 · FLASH20</p>
          <button onClick={() => navigate('/checkout', { state: { coupon } })} className="mt-4 min-h-[48px] w-full rounded-lg bg-primary font-bold text-white hover:bg-primary-dark">{t('checkout')} →</button>
          <Link to="/products" className="mt-2 flex min-h-[44px] items-center justify-center rounded-lg border font-semibold hover:bg-surface">{t('continueShopping')}</Link>
        </aside>
      </div>
    </div>
  )
}
