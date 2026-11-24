import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Smartphone, Shirt, ShoppingBasket, Sofa, Sparkles, Dumbbell, Tv, Watch, Zap, Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getProducts, getBanners, getSellers } from '../lib/firestore'
import { CATEGORIES } from '../data/demo'
import { formatTaka } from '../lib/format'
import SEO from '../components/SEO'
import ProductCard from '../components/ProductCard'
import ProductImage from '../components/ProductImage'
import { ProductCardSkeleton, SectionError, EmptyState } from '../components/States'

const CAT_ICONS = { Smartphone, Shirt, ShoppingBasket, Sofa, Sparkles, Dumbbell, Tv, Watch }

// Simulated async section load with 8s timeout + per-section error/retry
// (resilient_remote_data_loading: shell first, sections load independently).
function useSection(loader) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const load = () => {
    setState({ status: 'loading', data: null, error: '' })
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    loader(ctrl.signal)
      .then((data) => { clearTimeout(timer); if (!ctrl.signal.aborted) setState({ status: 'ok', data, error: '' }) })
      .catch((err) => { clearTimeout(timer); if (!ctrl.signal.aborted) setState({ status: 'error', data: null, error: err.message || 'Failed to load.' }) })
  }
  useEffect(load, [])
  return { ...state, retry: load }
}

function useCountdown(targetHours = 12) {
  const target = useMemo(() => Date.now() + targetHours * 3600 * 1000, [targetHours])
  const [left, setLeft] = useState(target - Date.now())
  useEffect(() => { const id = setInterval(() => setLeft(Math.max(0, target - Date.now())), 1000); return () => clearInterval(id) }, [target])
  const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000)
  return [h, m, s].map((n) => String(n).padStart(2, '0'))
}

export default function Home() {
  const { lang, t } = useLanguage()
  const products = useSection(async (signal) => {
    await new Promise((r) => setTimeout(r, 350))
    if (signal.aborted) throw new Error('aborted')
    return getProducts().filter((p) => p.status === 'approved' && !p.deleted)
  })
  const [slide, setSlide] = useState(0)
  const banners = getBanners().filter((b) => b.active)
  const [h, m, s] = useCountdown(11)
  useEffect(() => { const id = setInterval(() => setSlide((x) => (x + 1) % Math.max(1, banners.length)), 5000); return () => clearInterval(id) }, [banners.length])

  const list = products.data || []
  const flash = list.filter((p) => p.flash).slice(0, 8)
  const trending = list.filter((p) => p.trending).slice(0, 8)
  const best = [...list].sort((a, b) => b.sold - a.sold).slice(0, 8)
  const recommended = [...list].sort((a, b) => b.rating - a.rating).slice(0, 8)
  const sellers = getSellers().filter((x) => x.status === 'approved')

  return (
    <div>
      <SEO title={lang === 'bn' ? 'হোম' : 'Home'} description="SP Marketplace — বাংলাদেশের মাল্টি-ভেন্ডর অনলাইন শপিং মার্কেটপ্লেস।" />
      {/* Hero carousel — Feature-Rich Showcase pattern */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 pt-4" aria-label="Promotions">
        <div className="relative overflow-hidden rounded-2xl bg-ink">
          {banners.map((b, i) => (
            <Link key={b.id} to={b.link} className={`${i === slide ? 'block' : 'hidden'} relative`}>
              <div className="relative h-56 sm:h-80">
                <ProductImage src={b.image} alt={lang === 'bn' ? b.title : b.titleEn} eager className="h-full w-full object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
                <div className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 max-w-md text-white">
                  <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">{lang === 'bn' ? b.title : b.titleEn}</h1>
                  <p className="mt-2 text-sm sm:text-base text-gray-200">{b.subtitle}</p>
                  <span className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold">{t('shopNow')}</span>
                </div>
              </div>
            </Link>
          ))}
          <button onClick={() => setSlide((slide - 1 + banners.length) % banners.length)} aria-label="Previous banner" className="absolute left-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-ink"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={() => setSlide((slide + 1) % banners.length)} aria-label="Next banner" className="absolute right-2 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-ink"><ChevronRight className="h-6 w-6" /></button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => <button key={b.id} onClick={() => setSlide(i)} aria-label={`Go to banner ${i + 1}`} className={`h-2 rounded-full ${i === slide ? 'w-6 bg-primary' : 'w-2 bg-white/60'}`} />)}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Truck, title: lang === 'bn' ? 'দ্রুত ডেলিভারি' : 'Fast Delivery', sub: lang === 'bn' ? 'ঢাকায় ২৪ ঘণ্টা' : '24h in Dhaka' },
            { icon: ShieldCheck, title: lang === 'bn' ? 'নিরাপদ পেমেন্ট' : 'Secure Payment', sub: 'bKash · Nagad · COD' },
            { icon: RotateCcw, title: lang === 'bn' ? 'সহজ রিটার্ন' : 'Easy Returns', sub: lang === 'bn' ? '৭ দিনের রিটার্ন' : '7-day returns' },
            { icon: Headphones, title: lang === 'bn' ? 'সাপোর্ট ২৪/৭' : '24/7 Support', sub: lang === 'bn' ? 'যেকোনো সময়' : 'Anytime' },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary"><Icon className="h-6 w-6" /></span>
              <span><span className="block text-sm font-bold">{title}</span><span className="block text-xs text-muted">{sub}</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8" aria-label={t('categories')}>
        <div className="flex items-center justify-between"><h2 className="text-xl sm:text-2xl font-extrabold">{t('categories')}</h2><Link to="/products" className="text-sm font-semibold text-primary min-h-[44px] flex items-center">{t('products')} →</Link></div>
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-8">
          {CATEGORIES.map((c) => {
            const Icon = CAT_ICONS[c.icon] || Smartphone
            return (
              <Link key={c.slug} to={`/category/${c.slug}`} className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm hover:border-primary hover:shadow transition">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary"><Icon className="h-6 w-6" /></span>
                <span className="text-xs sm:text-sm font-semibold leading-tight">{lang === 'bn' ? c.nameBn : c.name}</span>
              </Link>
            )
          })}
        </div>
      </section>

      {products.status === 'loading' && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}</div></section>
      )}
      {products.status === 'error' && (
        <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8"><SectionError message={lang === 'bn' ? 'পণ্য লোড করা যায়নি।' : 'Could not load products.'} onRetry={products.retry} /></section>
      )}
      {products.status === 'ok' && (
        <>
          {/* Flash sale with countdown */}
          <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8" aria-label={t('flashSale')}>
            <div className="rounded-2xl bg-gradient-to-r from-primary to-orange-500 p-4 sm:p-6 text-white">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-extrabold"><Zap className="h-6 w-6" />{t('flashSale')}</h2>
                <div className="flex items-center gap-1" aria-label="Sale ends in">
                  {[h, m, s].map((v, i) => <span key={i} className="flex h-11 min-w-11 items-center justify-center rounded-lg bg-black/30 px-2 font-mono text-lg font-bold">{v}</span>)}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {flash.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>

          <ProductSection title={t('trending')} items={trending} />
          <ProductSection title={t('bestSellers')} items={best} />
          <ProductSection title={t('recommended')} items={recommended} />

          {/* Featured stores */}
          <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8" aria-label={t('featuredStores')}>
            <h2 className="text-xl sm:text-2xl font-extrabold">{t('featuredStores')}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sellers.map((s) => (
                <Link key={s.id} to={`/products?seller=${s.id}`} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-lg transition">
                  <div className="h-24 bg-surface overflow-hidden"><ProductImage src={s.banner} alt={s.storeName} className="h-full w-full object-cover" /></div>
                  <div className="p-3">
                    <p className="font-bold">{lang === 'bn' ? s.storeNameBn : s.storeName} {s.verified && <span className="text-xs text-success">✓ {t('verified')}</span>}</p>
                    <p className="text-xs text-muted mt-1">{s.products} {lang === 'bn' ? 'পণ্য' : 'products'} · ★ {s.rating} · {s.followers.toLocaleString()} {lang === 'bn' ? 'ফলোয়ার' : 'followers'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Promo sections */}
          <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8">
            <div className="grid gap-3 md:grid-cols-2">
              <Link to="/products?flash=1" className="rounded-2xl bg-ink p-6 text-white hover:opacity-95">
                <p className="text-sm font-semibold text-orange-300">{lang === 'bn' ? 'সীমিত সময়ের অফার' : 'Limited time offer'}</p>
                <h3 className="mt-1 text-2xl font-extrabold">{lang === 'bn' ? 'ফ্ল্যাশ সেলে ৫০% পর্যন্ত ছাড়' : 'Up to 50% off in Flash Sale'}</h3>
                <span className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 font-semibold">{t('shopNow')}</span>
              </Link>
              <Link to="/seller/register" className="rounded-2xl bg-primary-light p-6 hover:opacity-95">
                <p className="text-sm font-semibold text-primary">{lang === 'bn' ? 'বিক্রেতাদের জন্য' : 'For sellers'}</p>
                <h3 className="mt-1 text-2xl font-extrabold">{lang === 'bn' ? 'আপনার স্টোর খুলুন, সারাদেশে বিক্রি করুন' : 'Open your store and sell nationwide'}</h3>
                <span className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 font-semibold text-white">{t('becomeSeller')}</span>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function ProductSection({ title, items }) {
  if (!items.length) return null
  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 mt-8" aria-label={title}>
      <div className="flex items-center justify-between"><h2 className="text-xl sm:text-2xl font-extrabold">{title}</h2><Link to="/products" className="text-sm font-semibold text-primary min-h-[44px] flex items-center">View all →</Link></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  )
}
