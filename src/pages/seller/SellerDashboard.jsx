import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Package, ShoppingCart, Wallet, Star, Plus, Pencil, Trash2, Upload, BadgeCheck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getProducts, saveProduct, deleteProduct, getSellerOrders, updateOrderStatus, getSellers, saveSeller, getSettings, getCoupons, saveCoupon, deleteCoupon, getReviews, addAudit } from '../../lib/firestore'
import { CATEGORIES } from '../../data/demo'
import { formatTaka, uid } from '../../lib/format'
import SEO from '../../components/SEO'
import ProductImage from '../../components/ProductImage'
import { EmptyState } from '../../components/States'

const TABS = ['overview', 'products', 'orders', 'earnings', 'reviews', 'coupons', 'settings']

export default function SellerDashboard() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [refresh, setRefresh] = useState(0)
  const sellerId = user?.sellerId || 's1'
  const seller = getSellers().find((s) => s.id === sellerId) || getSellers()[0]
  const myProducts = getProducts().filter((p) => p.sellerId === seller.id && !p.deleted)
  const myOrders = getSellerOrders().filter((o) => o.sellerId === seller.id)
  const myEarnings = myOrders.reduce((s, o) => s + o.sellerEarnings, 0)
  const myCommission = myOrders.reduce((s, o) => s + o.commission, 0)
  const myRevenue = myOrders.reduce((s, o) => s + o.subtotal, 0)
  const myReviews = getReviews().filter((r) => myProducts.some((p) => p.id === r.productId))

  const chartData = useMemo(() => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    return days.map((d, i) => ({ day: d, sales: Math.round(myRevenue / 7) + (i * 137) % 900, orders: Math.max(1, Math.round(myOrders.length / 3) + (i % 3)) }))
  }, [myRevenue, myOrders.length])

  const bump = () => setRefresh((x) => x + 1)
  void refresh

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={t('sellerDashboard')} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{seller ? (lang === 'bn' ? seller.storeNameBn : seller.storeName) : t('sellerDashboard')}</h1>
          <p className="text-sm text-muted flex items-center gap-2">
            {t('verification')}: {seller?.verified ? <span className="font-semibold text-success flex items-center gap-1"><BadgeCheck className="h-4 w-4" />{t('verified')}</span> : <span className="font-semibold text-amber-600">{t('notVerified')}</span>}
            {' · '}{t('status')}: <span className="font-semibold">{seller?.status === 'approved' ? t('approved') : t('pending')}</span>
          </p>
        </div>
        <button onClick={() => setTab('products')} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-white"><Plus className="h-5 w-5" />{t('addProduct')}</button>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Seller sections">
        {TABS.map((tb) => (
          <button key={tb} role="tab" aria-selected={tab === tb} onClick={() => setTab(tb)} className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 font-semibold ${tab === tb ? 'bg-primary text-white border-primary' : 'bg-white hover:border-primary'}`}>{t(tb === 'products' ? 'myProducts' : tb === 'orders' ? 'myOrders' : tb === 'earnings' ? 'earnings' : tb === 'reviews' ? 'myReviews' : tb === 'coupons' ? 'coupons' : tb === 'settings' ? 'settings' : tb === 'overview' ? 'overview' : tb)}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Wallet, label: t('revenue'), value: formatTaka(myRevenue) },
              { icon: ShoppingCart, label: t('totalOrders'), value: myOrders.length },
              { icon: Package, label: t('myProducts'), value: myProducts.length },
              { icon: Star, label: t('rating'), value: seller?.rating || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border bg-white p-4"><Icon className="h-6 w-6 text-primary" /><p className="mt-2 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted">{label}</p></div>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-bold">{t('analytics')} — {lang === 'bn' ? 'শেষ ৭ দিন' : 'Last 7 days'}</h2>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip formatter={(v) => formatTaka(v)} /><Bar dataKey="sales" fill="#F85606" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <h2 className="font-bold">{lang === 'bn' ? 'সাম্প্রতিক অর্ডার' : 'Recent orders'}</h2>
            {myOrders.length === 0 ? <p className="mt-2 text-sm text-muted">{lang === 'bn' ? 'এখনো কোনো অর্ডার নেই।' : 'No orders yet.'}</p> : myOrders.slice(0, 5).map((o) => (
              <div key={o.id} className="mt-2 flex justify-between border-t pt-2 text-sm"><span>{o.id}</span><span>{formatTaka(o.subtotal)}</span><span className="font-semibold">{t(o.status) || o.status}</span></div>
            ))}
          </div>
        </div>
      )}

      {tab === 'products' && <ProductManager sellerId={seller.id} products={myProducts} onChange={bump} />}
      {tab === 'orders' && <SellerOrders orders={myOrders} user={user} onChange={bump} />}
      {tab === 'earnings' && <Earnings orders={myOrders} earnings={myEarnings} commission={myCommission} revenue={myRevenue} />}
      {tab === 'reviews' && <SellerReviews reviews={myReviews} />}
      {tab === 'coupons' && <CouponManager />}
      {tab === 'settings' && <StoreSettings seller={seller} onChange={bump} />}
    </div>
  )
}

function ProductManager({ sellerId, products, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const { user } = useAuth()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', nameBn: '', category: 'electronics', price: '', oldPrice: '', stock: '', variants: '', description: '', image: '' })
  const startEdit = (p) => { setEditing(p.id); setForm({ name: p.name, nameBn: p.nameBn, category: p.category, price: p.price, oldPrice: p.oldPrice || '', stock: p.stock, variants: (p.variants || []).join(', '), description: p.description, image: p.images?.[0] || '' }) }
  const startNew = () => { setEditing('new'); setForm({ name: '', nameBn: '', category: 'electronics', price: '', oldPrice: '', stock: '10', variants: '', description: '', image: '' }) }
  const save = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.price) { toast.error(lang === 'bn' ? 'নাম ও দাম দিন।' : 'Name and price are required.'); return }
    const product = {
      id: editing === 'new' ? uid('p') : editing,
      name: form.name.trim(), nameBn: form.nameBn.trim() || form.name.trim(), category: form.category, sellerId,
      price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : 0,
      rating: 0, reviewCount: 0, stock: Number(form.stock) || 0, sold: 0,
      flash: false, trending: false, bestSeller: false,
      status: 'pending', // new/edited products require admin approval
      variants: form.variants.split(',').map((v) => v.trim()).filter(Boolean),
      images: [form.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80&auto=format&fit=crop'],
      description: form.description, descriptionBn: form.description,
    }
    saveProduct(product)
    addAudit({ actor: user?.name, role: 'seller', action: `${editing === 'new' ? 'Created' : 'Edited'} product ${product.name} (pending approval)`, target: product.id })
    toast.success(lang === 'bn' ? 'পণ্য জমা হয়েছে — অ্যাডমিন অনুমোদনের অপেক্ষায়।' : 'Product submitted — pending admin approval.')
    setEditing(null); onChange()
  }
  const inputCls = 'h-11 w-full rounded-lg border px-3 focus:border-primary focus:outline-none'
  return (
    <div className="mt-4">
      <div className="flex justify-between items-center"><h2 className="font-bold text-lg">{t('myProducts')} ({products.length})</h2><button onClick={startNew} className="flex min-h-[44px] items-center gap-1 rounded-lg bg-primary px-4 font-semibold text-white"><Plus className="h-5 w-5" />{t('addProduct')}</button></div>
      {editing && (
        <form onSubmit={save} className="mt-3 rounded-xl border bg-white p-4 grid gap-3 sm:grid-cols-2">
          <div><label className="text-sm font-medium" htmlFor="sp-name">{t('productName')} (EN)</label><input id="sp-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputCls} mt-1`} /></div>
          <div><label className="text-sm font-medium" htmlFor="sp-namebn">{t('productName')} (বাংলা)</label><input id="sp-namebn" value={form.nameBn} onChange={(e) => setForm({ ...form, nameBn: e.target.value })} className={`${inputCls} mt-1`} /></div>
          <div><label className="text-sm font-medium" htmlFor="sp-cat">{t('category')}</label><select id="sp-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={`${inputCls} mt-1`}>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label className="text-sm font-medium" htmlFor="sp-price">{t('productPrice')}</label><input id="sp-price" type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={`${inputCls} mt-1`} /></div>
          <div><label className="text-sm font-medium" htmlFor="sp-old">Old price (৳)</label><input id="sp-old" type="number" min="0" value={form.oldPrice} onChange={(e) => setForm({ ...form, oldPrice: e.target.value })} className={`${inputCls} mt-1`} /></div>
          <div><label className="text-sm font-medium" htmlFor="sp-stock">{t('stock')}</label><input id="sp-stock" type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={`${inputCls} mt-1`} /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="sp-variants">{t('variants')}</label><input id="sp-variants" value={form.variants} onChange={(e) => setForm({ ...form, variants: e.target.value })} placeholder="S, M, L" className={`${inputCls} mt-1`} /></div>
          <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="sp-image">Image URL</label><input id="sp-image" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://…" className={`${inputCls} mt-1`} />
            <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:border-primary"><Upload className="h-5 w-5 text-primary" />{lang === 'bn' ? 'ছবি আপলোড (প্রিভিউ)' : 'Upload image (preview)'}<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setForm((prev) => ({ ...prev, image: r.result })); r.readAsDataURL(f) }} /></label>
            {form.image && <div className="mt-2 h-24 w-24 overflow-hidden rounded-lg border"><ProductImage src={form.image} alt="Preview" className="h-full w-full object-cover" /></div>}
          </div>
          <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="sp-desc">{t('description')}</label><textarea id="sp-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-lg border p-2" /></div>
          <div className="sm:col-span-2 flex gap-2"><button type="submit" className="min-h-[44px] rounded-lg bg-primary px-5 font-semibold text-white">{t('save')}</button><button type="button" onClick={() => setEditing(null)} className="min-h-[44px] rounded-lg border px-5 font-semibold">{t('cancel')}</button></div>
        </form>
      )}
      <div className="mt-3 space-y-2">
        {products.length === 0 && <EmptyState icon={Package} title={lang === 'bn' ? 'এখনো কোনো পণ্য নেই' : 'No products yet'} />}
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface"><ProductImage src={p.images?.[0]} alt={p.name} className="h-full w-full object-cover" /></span>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{lang === 'bn' ? p.nameBn : p.name}</p>
              <p className="text-sm text-muted">{formatTaka(p.price)} · {t('stock')}: {p.stock} · <span className={`font-semibold ${p.status === 'approved' ? 'text-success' : p.status === 'rejected' ? 'text-danger' : 'text-amber-600'}`}>{t(p.status) || p.status}</span></p>
            </div>
            <button onClick={() => startEdit(p)} aria-label="Edit product" className="flex h-11 w-11 items-center justify-center rounded-lg border hover:border-primary"><Pencil className="h-5 w-5" /></button>
            <button onClick={() => { deleteProduct(p.id); toast.info(lang === 'bn' ? 'পণ্য মুছে ফেলা হয়েছে' : 'Product deleted'); onChange() }} aria-label="Delete product" className="flex h-11 w-11 items-center justify-center rounded-lg border text-red-600 hover:border-red-600"><Trash2 className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SellerOrders({ orders, user, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const change = (id, status) => { updateOrderStatus(id, status, user); toast.success(`${id} → ${status}`); onChange() }
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('myOrders')} ({orders.length})</h2>
      {orders.length === 0 && <EmptyState icon={ShoppingCart} title={lang === 'bn' ? 'এখনো কোনো অর্ডার নেই' : 'No orders yet'} />}
      {orders.map((o) => (
        <article key={o.id} className="rounded-xl border bg-white p-4">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{o.id}</p><span className="font-semibold">{t(o.status) || o.status}</span></div>
          <p className="mt-1 text-sm text-muted">{o.items.map((i) => `${i.name} × ${i.qty}`).join(', ')}</p>
          <p className="mt-1 text-sm">{t('subtotal')}: <b>{formatTaka(o.subtotal)}</b> · {t('sellerEarnings')}: <b className="text-success">{formatTaka(o.sellerEarnings)}</b></p>
          <div className="mt-3 flex gap-2">
            {o.status === 'processing' && <button onClick={() => change(o.id, 'shipped')} className="min-h-[44px] rounded-lg bg-primary px-4 font-semibold text-white">Mark shipped</button>}
            {o.status === 'shipped' && <button onClick={() => change(o.id, 'delivered')} className="min-h-[44px] rounded-lg bg-success px-4 font-semibold text-white">Mark delivered</button>}
            {o.status !== 'cancelled' && o.status !== 'delivered' && <button onClick={() => change(o.id, 'cancelled')} className="min-h-[44px] rounded-lg border px-4 font-semibold text-red-600">Cancel</button>}
          </div>
        </article>
      ))}
    </div>
  )
}

function Earnings({ orders, earnings, commission, revenue }) {
  const { t, lang } = useLanguage()
  const settings = getSettings()
  const chartData = orders.slice(0, 7).map((o, i) => ({ name: `Order ${i + 1}`, earnings: o.sellerEarnings, commission: o.commission }))
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-muted">{t('revenue')}</p><p className="text-xl font-extrabold">{formatTaka(revenue)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-muted">{t('commission')} ({Math.round(settings.commissionRate * 100)}%)</p><p className="text-xl font-extrabold text-red-600">−{formatTaka(commission)}</p></div>
        <div className="rounded-xl border bg-white p-4"><p className="text-sm text-muted">{t('sellerEarnings')}</p><p className="text-xl font-extrabold text-success">{formatTaka(earnings)}</p></div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-bold">{lang === 'bn' ? 'আয় বনাম কমিশন' : 'Earnings vs commission'}</h2>
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v) => formatTaka(v)} /><Line type="monotone" dataKey="earnings" stroke="#16A34A" strokeWidth={2} /><Line type="monotone" dataKey="commission" stroke="#F85606" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-bold">{t('commissions')} — {lang === 'bn' ? 'বিস্তারিত' : 'detail'}</h2>
        {orders.length === 0 ? <p className="mt-2 text-sm text-muted">{lang === 'bn' ? 'এখনো কোনো কমিশন নেই।' : 'No commissions yet.'}</p> : orders.map((o) => (
          <div key={o.id} className="mt-2 flex justify-between border-t pt-2 text-sm"><span>{o.id}</span><span>{formatTaka(o.subtotal)}</span><span className="text-red-600">−{formatTaka(o.commission)}</span><span className="font-bold text-success">{formatTaka(o.sellerEarnings)}</span></div>
        ))}
      </div>
    </div>
  )
}

function SellerReviews({ reviews }) {
  const { t, lang } = useLanguage()
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('myReviews')} ({reviews.length})</h2>
      {reviews.length === 0 && <EmptyState icon={Star} title={lang === 'bn' ? 'এখনো কোনো রিভিউ নেই' : 'No reviews yet'} />}
      {reviews.map((r) => (
        <article key={r.id} className="rounded-xl border bg-white p-4"><p className="font-bold">{r.userName} · ★ {r.rating}</p><p className="mt-1 text-sm text-gray-700">{r.comment}</p><p className="text-xs text-muted">{r.date}</p></article>
      ))}
    </div>
  )
}

function CouponManager() {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [pct, setPct] = useState('')
  const [min, setMin] = useState('')
  const [refresh, setRefresh] = useState(0)
  void refresh
  const coupons = getCoupons()
  const add = (e) => {
    e.preventDefault()
    if (!code.trim() || !pct) return
    saveCoupon({ code: code.trim().toUpperCase(), discountPercent: Number(pct), minOrder: Number(min) || 0, active: true, description: `${pct}% off` })
    toast.success(t('couponApplied')); setCode(''); setPct(''); setMin(''); setRefresh((x) => x + 1)
  }
  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg">{t('coupons')}</h2>
      <form onSubmit={add} className="mt-3 flex flex-wrap gap-2 rounded-xl border bg-white p-4">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className="h-11 rounded-lg border px-3 uppercase" aria-label="Coupon code" />
        <input value={pct} onChange={(e) => setPct(e.target.value)} type="number" min="1" max="90" placeholder="% off" className="h-11 w-24 rounded-lg border px-3" aria-label="Discount percent" />
        <input value={min} onChange={(e) => setMin(e.target.value)} type="number" min="0" placeholder="Min order ৳" className="h-11 w-32 rounded-lg border px-3" aria-label="Minimum order" />
        <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-5 font-semibold text-white">{t('addProduct').replace('পণ্য', 'কুপন').replace('Product', 'Coupon')}</button>
      </form>
      <div className="mt-3 space-y-2">
        {coupons.map((c) => (
          <div key={c.code} className="flex items-center justify-between rounded-xl border bg-white p-3">
            <span><b>{c.code}</b> — {c.discountPercent}% off · min {formatTaka(c.minOrder)} · {c.active ? t('approved') : t('pending')}</span>
            <button onClick={() => { deleteCoupon(c.code); toast.info(lang === 'bn' ? 'কুপন মোছা হয়েছে' : 'Coupon deleted'); setRefresh((x) => x + 1) }} className="flex h-11 w-11 items-center justify-center rounded-lg border text-red-600" aria-label="Delete coupon"><Trash2 className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function StoreSettings({ seller, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const [name, setName] = useState(seller?.storeName || '')
  const [logo, setLogo] = useState(seller?.logo || '')
  const [banner, setBanner] = useState(seller?.banner || '')
  const fileToDataUrl = (file, setter) => { const r = new FileReader(); r.onload = () => setter(r.result); r.readAsDataURL(file) }
  const save = (e) => {
    e.preventDefault()
    saveSeller({ ...seller, storeName: name, storeNameBn: name, logo, banner })
    toast.success(lang === 'bn' ? 'স্টোর সেটিংস সংরক্ষিত হয়েছে!' : 'Store settings saved!')
    onChange()
  }
  return (
    <form onSubmit={save} className="mt-4 rounded-xl border bg-white p-4 space-y-4">
      <h2 className="font-bold text-lg">{t('storeSettings')}</h2>
      <div><label className="text-sm font-medium" htmlFor="ss-name">{t('storeName')}</label><input id="ss-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" /></div>
      <div>
        <label className="text-sm font-medium">Store logo</label>
        <label className="mt-1 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:border-primary"><Upload className="h-5 w-5 text-primary" />Upload logo<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fileToDataUrl(e.target.files[0], setLogo)} /></label>
        {logo && <div className="mt-2 h-20 w-20 overflow-hidden rounded-lg border"><ProductImage src={logo} alt="Logo preview" className="h-full w-full object-cover" /></div>}
        <p className="mt-1 text-xs text-muted">{lang === 'bn' ? 'ডেমো মোডে ছবি ব্রাউজারেই প্রিভিউ হয়; Firebase চালু থাকলে Storage-এ আপলোড হয়।' : 'In Demo Mode the image is previewed locally; with Firebase configured it uploads to Storage.'}</p>
      </div>
      <div>
        <label className="text-sm font-medium">Store banner</label>
        <label className="mt-1 flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:border-primary"><Upload className="h-5 w-5 text-primary" />Upload banner<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fileToDataUrl(e.target.files[0], setBanner)} /></label>
        {banner && <div className="mt-2 h-24 w-full overflow-hidden rounded-lg border"><ProductImage src={banner} alt="Banner preview" className="h-full w-full object-cover" /></div>}
      </div>
      <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-6 font-semibold text-white">{t('save')}</button>
    </form>
  )
}
