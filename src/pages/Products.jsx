import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getProducts, getSellers, getCategory, getCategories } from '../lib/firestore'

import SEO from '../components/SEO'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton, EmptyState } from '../components/States'

const PAGE_SIZE = 12

export default function Products({ mode = 'all' }) {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const { lang, t } = useLanguage()
  const [sort, setSort] = useState('newest')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const q = params.get('q') || ''
  const sellerFilter = params.get('seller') || ''
  const flashOnly = params.get('flash') === '1'
  const category = mode === 'category' ? getCategory(slug) : null

  // Simulate a short fetch so skeletons show; data is local in demo mode.
  useEffect(() => { setLoading(true); const id = setTimeout(() => setLoading(false), 250); return () => clearTimeout(id) }, [mode, slug, q, sellerFilter, flashOnly])
  useEffect(() => { setPage(1) }, [mode, slug, q, sellerFilter, flashOnly, sort])

  const all = getProducts().filter((p) => p.status === 'approved' && !p.deleted)
  const filtered = useMemo(() => {
    let list = [...all]
    if (mode === 'category' && slug) list = list.filter((p) => p.category === slug)
    if (mode === 'search' && q) {
      const needle = q.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(needle) || p.nameBn.includes(q) || p.category.includes(needle))
    }
    if (sellerFilter) list = list.filter((p) => p.sellerId === sellerFilter)
    if (flashOnly) list = list.filter((p) => p.flash)
    if (minPrice !== '') list = list.filter((p) => p.price >= Number(minPrice))
    if (maxPrice !== '') list = list.filter((p) => p.price <= Number(maxPrice))
    if (sort === 'priceLow') list.sort((a, b) => a.price - b.price)
    else if (sort === 'priceHigh') list.sort((a, b) => b.price - a.price)
    else if (sort === 'topRated') list.sort((a, b) => b.rating - a.rating)
    else if (sort === 'mostSold') list.sort((a, b) => b.sold - a.sold)
    return list
  }, [all, mode, slug, q, sellerFilter, flashOnly, minPrice, maxPrice, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const seller = sellerFilter ? getSellers().find((s) => s.id === sellerFilter) : null
  const title = mode === 'category' ? (category ? (lang === 'bn' ? category.nameBn : category.name) : 'Category')
    : mode === 'search' ? `"${q}"` : seller ? (lang === 'bn' ? seller.storeNameBn : seller.storeName) : t('products')

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={title} />
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">{t('home')}</Link> {' / '} <span className="text-ink font-semibold">{title}</span>
      </nav>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{title} <span className="text-base font-medium text-muted">({filtered.length})</span></h1>
        <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex min-h-[44px] items-center gap-2 rounded-lg border px-4 font-semibold"><SlidersHorizontal className="h-5 w-5" />{t('filter')}</button>
      </div>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <aside className={`${showFilters ? 'block' : 'hidden'} lg:block lg:w-64 shrink-0`} aria-label="Filters">
          <div className="rounded-xl border bg-white p-4 space-y-5 sticky top-24">
            <div>
              <h2 className="font-bold">{t('categories')}</h2>
              <ul className="mt-2 space-y-1 text-sm">
                <li><Link to="/products" className="block min-h-[36px] py-1 hover:text-primary">{t('products')}</Link></li>
                {getCategories().map((c) => (
                  <li key={c.slug}><Link to={`/category/${c.slug}`} className={`block min-h-[36px] py-1 hover:text-primary ${slug === c.slug ? 'font-bold text-primary' : ''}`}>{lang === 'bn' ? c.nameBn : c.name}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-bold">{t('price')}</h2>
              <div className="mt-2 flex items-center gap-2">
                <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min" aria-label="Minimum price" className="h-11 w-full rounded-lg border px-2" />
                <span>–</span>
                <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max" aria-label="Maximum price" className="h-11 w-full rounded-lg border px-2" />
              </div>
            </div>
            <button onClick={() => { setMinPrice(''); setMaxPrice(''); setSort('newest'); setParams({}) }} className="min-h-[44px] w-full rounded-lg border font-semibold hover:bg-surface">{t('clearFilters')}</button>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">{filtered.length} {lang === 'bn' ? 'টি পণ্য' : 'products'}</p>
            <label className="flex items-center gap-2 text-sm font-medium">
              {t('sortBy')}
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-lg border px-2 bg-white">
                <option value="newest">{t('newest')}</option>
                <option value="priceLow">{t('priceLow')}</option>
                <option value="priceHigh">{t('priceHigh')}</option>
                <option value="topRated">{t('topRated')}</option>
                <option value="mostSold">{t('mostSold')}</option>
              </select>
            </label>
          </div>

          {loading ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ProductCardSkeleton key={i} />)}</div>
          ) : pageItems.length === 0 ? (
            <div className="mt-4"><EmptyState icon={SearchX} title={t('noProducts')} text={t('noProductsText')} action={<Link to="/products" className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 font-semibold text-white">{t('continueShopping')}</Link>} /></div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {pageItems.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
              {pages > 1 && (
                <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pagination">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined} className={`flex h-11 min-w-11 items-center justify-center rounded-lg border px-3 font-semibold ${n === page ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-surface'}`}>{n}</button>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
