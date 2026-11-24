import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Users, Store, Package, Wallet, Check, X, Trash2, Plus, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getOrders, getSellerOrders, updateOrderStatus, getUsers, getProducts, saveProduct, getSellers, saveSeller, getCoupons, saveCoupon, deleteCoupon, getBanners, saveBanner, getAuditLogs, addAudit, getModerators, saveModerator, deleteModerator, getSettings, saveSettings } from '../../lib/firestore'
import { CATEGORIES } from '../../data/demo'
import { formatTaka, uid, timeAgo } from '../../lib/format'
import SEO from '../../components/SEO'
import { EmptyState } from '../../components/States'

const ALL_TABS = ['overview', 'sellers', 'products', 'categories', 'orders', 'customers', 'commissions', 'payments', 'coupons', 'banners', 'moderators', 'settings', 'reports', 'audit']
// Moderators have configurable LIMITED permissions: they may approve products
// and manage orders/categories, but NOT moderators, settings or commissions.
const MODERATOR_TABS = ['overview', 'sellers', 'products', 'categories', 'orders', 'customers', 'coupons', 'banners', 'reports', 'audit']

export default function AdminDashboard() {
  const { t, lang } = useLanguage()
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('overview')
  const [refresh, setRefresh] = useState(0)
  const isMod = user?.role === 'moderator'
  const tabs = isMod ? MODERATOR_TABS : ALL_TABS
  const bump = () => setRefresh((x) => x + 1)
  void refresh

  const orders = getOrders()
  const sellerOrders = getSellerOrders()
  const revenue = orders.reduce((s, o) => s + o.total, 0)
  const commissionTotal = sellerOrders.reduce((s, o) => s + o.commission, 0)

  const tabLabel = (tb) => t(tb === 'sellers' ? 'sellerApproval' : tb === 'products' ? 'productApproval' : tb === 'categories' ? 'categoryManagement' : tb === 'orders' ? 'orderManagement' : tb === 'customers' ? 'customerManagement' : tb === 'commissions' ? 'commissions' : tb === 'payments' ? 'payments' : tb === 'coupons' ? 'coupons' : tb === 'banners' ? 'bannerManagement' : tb === 'moderators' ? 'moderatorManagement' : tb === 'settings' ? 'websiteSettings' : tb === 'reports' ? 'reports' : tb === 'audit' ? 'auditLogs' : tb === 'overview' ? 'overview' : tb)

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={t('adminDashboard')} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-primary" />{t('adminDashboard')}</h1>
        {isMod && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{lang === 'bn' ? 'মডারেটর — সীমিত অনুমতি' : 'Moderator — limited permissions'}</span>}
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Admin sections">
        {tabs.map((tb) => (
          <button key={tb} role="tab" aria-selected={tab === tb} onClick={() => setTab(tb)} className={`min-h-[44px] whitespace-nowrap rounded-full border px-4 font-semibold ${tab === tb ? 'bg-primary text-white border-primary' : 'bg-white hover:border-primary'}`}>{tabLabel(tb)}</button>
        ))}
      </div>

      {tab === 'overview' && <Overview orders={orders} revenue={revenue} commissionTotal={commissionTotal} />}
      {tab === 'sellers' && <SellerApproval user={user} onChange={bump} />}
      {tab === 'products' && <ProductApproval user={user} onChange={bump} />}
      {tab === 'categories' && <CategoryManager user={user} />}
      {tab === 'orders' && <OrderManager user={user} onChange={bump} />}
      {tab === 'customers' && <CustomerManager />}
      {tab === 'commissions' && !isMod && <CommissionManager sellerOrders={sellerOrders} commissionTotal={commissionTotal} />}
      {tab === 'payments' && <PaymentManager />}
      {tab === 'coupons' && <CouponAdmin user={user} onChange={bump} />}
      {tab === 'banners' && <BannerAdmin user={user} onChange={bump} />}
      {tab === 'moderators' && !isMod && <ModeratorManager user={user} onChange={bump} />}
      {tab === 'settings' && !isMod && <SiteSettings user={user} onChange={bump} />}
      {tab === 'reports' && <Reports orders={orders} sellerOrders={sellerOrders} revenue={revenue} />}
      {tab === 'audit' && <AuditLog />}
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return <div className="rounded-xl border bg-white p-4"><Icon className="h-6 w-6 text-primary" /><p className="mt-2 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted">{label}</p></div>
}

function Overview({ orders, revenue, commissionTotal }) {
  const { t, lang } = useLanguage()
  const users = getUsers()
  const sellers = getSellers()
  const chartData = useMemo(() => {
    const days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    return days.map((d, i) => ({ day: d, revenue: Math.round(revenue / 7) + (i * 211) % 1500, orders: Math.max(1, Math.round(orders.length / 3) + (i % 3)) }))
  }, [revenue, orders.length])
  const pie = [
    { name: lang === 'bn' ? 'সেলার আয়' : 'Seller earnings', value: Math.max(0, revenue - commissionTotal) },
    { name: lang === 'bn' ? 'কমিশন' : 'Commission', value: commissionTotal },
  ]
  return (
    <div className="mt-4 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Wallet} label={t('revenue')} value={formatTaka(revenue)} />
        <Stat icon={Package} label={t('totalOrders')} value={orders.length} />
        <Stat icon={Users} label={t('totalCustomers')} value={users.filter((u) => u.role === 'customer').length} />
        <Stat icon={Store} label={t('totalSellers')} value={sellers.length} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-bold">{lang === 'bn' ? 'সাপ্তাহিক আয়' : 'Weekly revenue'}</h2>
          <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip formatter={(v) => formatTaka(v)} /><Bar dataKey="revenue" fill="#F85606" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-bold">{lang === 'bn' ? 'আয় বনাম কমিশন' : 'Revenue vs commission'}</h2>
          <div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>{pie.map((_, i) => <Cell key={i} fill={i === 0 ? '#16A34A' : '#F85606'} />)}</Pie><Tooltip formatter={(v) => formatTaka(v)} /></PieChart></ResponsiveContainer></div>
        </div>
      </div>
    </div>
  )
}

function SellerApproval({ user, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const sellers = getSellers()
  const decide = (s, status) => {
    saveSeller({ ...s, status, verified: status === 'approved' })
    addAudit({ actor: user?.name, role: user?.role, action: `Seller ${s.storeName} ${status}`, target: s.id })
    toast.success(`${s.storeName} → ${status}`); onChange()
  }
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('sellerApproval')} ({sellers.length})</h2>
      {sellers.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-xl font-extrabold text-primary">{s.storeName[0]}</span>
          <div className="flex-1 min-w-40"><p className="font-bold">{lang === 'bn' ? s.storeNameBn : s.storeName}</p><p className="text-sm text-muted">{s.owner} · ★ {s.rating} · {s.products} {lang === 'bn' ? 'পণ্য' : 'products'}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.status === 'approved' ? 'bg-green-100 text-green-800' : s.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{t(s.status) || s.status}</span>
          {s.status !== 'approved' && <button onClick={() => decide(s, 'approved')} className="flex min-h-[44px] items-center gap-1 rounded-lg bg-success px-4 font-semibold text-white"><Check className="h-5 w-5" />{t('approve')}</button>}
          {s.status !== 'rejected' && <button onClick={() => decide(s, 'rejected')} className="flex min-h-[44px] items-center gap-1 rounded-lg border px-4 font-semibold text-red-600"><X className="h-5 w-5" />{t('reject')}</button>}
        </div>
      ))}
    </div>
  )
}

function ProductApproval({ user, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const products = getProducts().filter((p) => !p.deleted)
  const decide = (p, status) => {
    saveProduct({ ...p, status })
    addAudit({ actor: user?.name, role: user?.role, action: `Product ${p.name} ${status}`, target: p.id })
    toast.success(`${p.name} → ${status}`); onChange()
  }
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('productApproval')} ({products.filter((p) => p.status === 'pending').length} {t('pending')})</h2>
      {products.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface"><img src={p.images?.[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover" /></span>
          <div className="flex-1 min-w-40"><p className="font-bold truncate">{lang === 'bn' ? p.nameBn : p.name}</p><p className="text-sm text-muted">{formatTaka(p.price)} · {t('stock')}: {p.stock}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${p.status === 'approved' ? 'bg-green-100 text-green-800' : p.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{t(p.status) || p.status}</span>
          {p.status !== 'approved' && <button onClick={() => decide(p, 'approved')} className="flex min-h-[44px] items-center gap-1 rounded-lg bg-success px-4 font-semibold text-white"><Check className="h-5 w-5" />{t('approve')}</button>}
          {p.status !== 'rejected' && <button onClick={() => decide(p, 'rejected')} className="flex min-h-[44px] items-center gap-1 rounded-lg border px-4 font-semibold text-red-600"><X className="h-5 w-5" />{t('reject')}</button>}
        </div>
      ))}
    </div>
  )
}

function CategoryManager() {
  const { t, lang } = useLanguage()
  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg">{t('categoryManagement')} ({CATEGORIES.length})</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((c) => (
          <div key={c.slug} className="rounded-xl border bg-white p-4"><p className="font-bold">{lang === 'bn' ? c.nameBn : c.name}</p><p className="text-xs text-muted">/{c.slug} · {getProducts().filter((p) => p.category === c.slug && !p.deleted).length} {lang === 'bn' ? 'পণ্য' : 'products'}</p></div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{lang === 'bn' ? 'নতুন ক্যাটাগরি যোগ করতে src/data/demo.js-এর CATEGORIES-এ যোগ করুন (প্রোডাকশনে Firestore categories কালেকশন ব্যবহার করুন)।' : 'To add a category, add it to CATEGORIES in src/data/demo.js (in production use the Firestore categories collection).'}</p>
    </div>
  )
}

function OrderManager({ user, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const orders = getOrders()
  const change = (id, status) => {
    updateOrderStatus(id, status, user)
    toast.success(`${id} → ${status}`); onChange()
  }
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('orderManagement')} ({orders.length})</h2>
      {orders.length === 0 && <EmptyState icon={Package} title={lang === 'bn' ? 'এখনো কোনো অর্ডার নেই' : 'No orders yet'} />}
      {orders.map((o) => (
        <div key={o.id} className="rounded-xl border bg-white p-4">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-bold">{o.id}</p><span className="font-semibold">{t(o.status) || o.status}</span></div>
          <p className="text-sm text-muted">{o.customerName} · {o.paymentMethod.toUpperCase()} · {formatTaka(o.total)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {['processing', 'shipped', 'delivered', 'cancelled'].filter((s) => s !== o.status).map((s) => (
              <button key={s} onClick={() => change(o.id, s)} className="min-h-[40px] rounded-lg border px-3 text-sm font-semibold hover:border-primary">{lang === 'bn' ? 'করুন: ' : 'Set: '}{t(s) || s}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CustomerManager() {
  const { t, lang } = useLanguage()
  const users = getUsers()
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('customerManagement')} ({users.length})</h2>
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-xl border bg-white p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light font-bold text-primary">{u.name?.[0]}</span>
          <div className="flex-1"><p className="font-bold">{u.name}</p><p className="text-sm text-muted">{u.email}</p></div>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold">{t(u.role) || u.role}</span>
        </div>
      ))}
      <p className="text-sm text-muted">{lang === 'bn' ? 'ডেমো মোডে কাস্টমার তালিকা ডেমো ডেটা থেকে আসে।' : 'In Demo Mode the customer list comes from demo data.'}</p>
    </div>
  )
}

function CommissionManager({ sellerOrders, commissionTotal }) {
  const { t, lang } = useLanguage()
  const settings = getSettings()
  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg">{t('commissions')} — {lang === 'bn' ? 'মোট' : 'total'}: {formatTaka(commissionTotal)} ({Math.round(settings.commissionRate * 100)}%)</h2>
      <div className="mt-3 space-y-2">
        {sellerOrders.length === 0 && <EmptyState icon={Wallet} title={lang === 'bn' ? 'এখনো কোনো কমিশন নেই' : 'No commissions yet'} />}
        {sellerOrders.map((o) => (
          <div key={o.id} className="flex flex-wrap justify-between gap-2 rounded-xl border bg-white p-3 text-sm">
            <span className="font-semibold">{o.id}</span><span>{formatTaka(o.subtotal)}</span><span className="text-red-600">−{formatTaka(o.commission)}</span><span className="font-bold text-success">{formatTaka(o.sellerEarnings)}</span><span className="text-muted">{t(o.status) || o.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PaymentManager() {
  const { t, lang } = useLanguage()
  const payments = JSON.parse(localStorage.getItem('sp_payments') || '[]')
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('payments')} ({payments.length})</h2>
      {payments.length === 0 && <EmptyState icon={Wallet} title={lang === 'bn' ? 'এখনো কোনো পেমেন্ট নেই' : 'No payments yet'} />}
      {payments.map((p) => (
        <div key={p.id} className="rounded-xl border bg-white p-3 text-sm">
          <p className="font-bold">{p.orderId} · {p.method.toUpperCase()} · {formatTaka(p.amount)}</p>
          <p className="text-muted">{p.txnId ? `TrxID: ${p.txnId}` : p.cardLast4 ? `Card •••• ${p.cardLast4}` : 'Cash on Delivery'} · {p.status}</p>
        </div>
      ))}
      <p className="text-sm text-muted">{lang === 'bn' ? 'কার্ড নম্বর কখনো সংরক্ষণ করা হয় না — শুধু শেষ ৪ ডিজিট রাখা হয়।' : 'Card numbers are never stored — only the last 4 digits are kept.'}</p>
    </div>
  )
}

function CouponAdmin({ onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [pct, setPct] = useState('')
  const [min, setMin] = useState('')
  const [refresh, setRefresh] = useState(0)
  void refresh
  const coupons = getCoupons()
  const add = (e) => { e.preventDefault(); if (!code.trim() || !pct) return; saveCoupon({ code: code.trim().toUpperCase(), discountPercent: Number(pct), minOrder: Number(min) || 0, active: true, description: `${pct}% off` }); toast.success(t('couponApplied')); setCode(''); setPct(''); setMin(''); setRefresh((x) => x + 1); onChange() }
  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg">{t('coupons')}</h2>
      <form onSubmit={add} className="mt-3 flex flex-wrap gap-2 rounded-xl border bg-white p-4">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className="h-11 rounded-lg border px-3 uppercase" aria-label="Coupon code" />
        <input value={pct} onChange={(e) => setPct(e.target.value)} type="number" min="1" max="90" placeholder="% off" className="h-11 w-24 rounded-lg border px-3" aria-label="Discount percent" />
        <input value={min} onChange={(e) => setMin(e.target.value)} type="number" min="0" placeholder="Min order ৳" className="h-11 w-32 rounded-lg border px-3" aria-label="Minimum order" />
        <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-5 font-semibold text-white"><Plus className="h-5 w-5 inline" /> Add</button>
      </form>
      <div className="mt-3 space-y-2">
        {coupons.map((c) => (
          <div key={c.code} className="flex items-center justify-between rounded-xl border bg-white p-3"><span><b>{c.code}</b> — {c.discountPercent}% off · min {formatTaka(c.minOrder)}</span><button onClick={() => { deleteCoupon(c.code); toast.info(lang === 'bn' ? 'কুপন মোছা হয়েছে' : 'Coupon deleted'); setRefresh((x) => x + 1) }} className="flex h-11 w-11 items-center justify-center rounded-lg border text-red-600" aria-label="Delete coupon"><Trash2 className="h-5 w-5" /></button></div>
        ))}
      </div>
    </div>
  )
}

function BannerAdmin({ onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [image, setImage] = useState('')
  const [link, setLink] = useState('/products')
  const [refresh, setRefresh] = useState(0)
  void refresh
  const banners = getBanners()
  const add = (e) => { e.preventDefault(); if (!title.trim() || !image.trim()) return; saveBanner({ id: uid('b'), title: title.trim(), titleEn: title.trim(), subtitle: '', image: image.trim(), link, active: true }); toast.success(lang === 'bn' ? 'ব্যানার যোগ হয়েছে!' : 'Banner added!'); setTitle(''); setImage(''); setRefresh((x) => x + 1); onChange() }
  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg">{t('bannerManagement')} ({banners.length})</h2>
      <form onSubmit={add} className="mt-3 grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Banner title" className="h-11 rounded-lg border px-3" aria-label="Banner title" />
        <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Image URL" className="h-11 rounded-lg border px-3" aria-label="Banner image URL" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/products" className="h-11 rounded-lg border px-3" aria-label="Banner link" />
        <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-5 font-semibold text-white sm:col-span-3"><Plus className="h-5 w-5 inline" /> Add banner</button>
      </form>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="rounded-xl border bg-white overflow-hidden"><img src={b.image} alt={b.title} loading="lazy" className="h-28 w-full object-cover" /><p className="p-3 font-bold text-sm">{lang === 'bn' ? b.title : b.titleEn} → {b.link}</p></div>
        ))}
      </div>
    </div>
  )
}

function ModeratorManager({ user, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [perms, setPerms] = useState({ canApproveProducts: true, canManageOrders: true, canManageCategories: true, canManageBanners: false, canManageCoupons: false })
  const mods = getModerators()
  const add = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    saveModerator({ id: uid('mod'), name: name.trim(), email: email.trim(), ...perms })
    addAudit({ actor: user?.name, role: user?.role, action: `Added moderator ${name} (${email})`, target: email })
    toast.success(lang === 'bn' ? 'মডারেটর যোগ হয়েছে!' : 'Moderator added!'); setName(''); setEmail(''); onChange()
  }
  return (
    <div className="mt-4">
      <h2 className="font-bold text-lg">{t('moderatorManagement')} ({mods.length})</h2>
      <form onSubmit={add} className="mt-3 rounded-xl border bg-white p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-11 rounded-lg border px-3" aria-label="Moderator name" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="h-11 rounded-lg border px-3" aria-label="Moderator email" />
        </div>
        <fieldset><legend className="text-sm font-semibold">{lang === 'bn' ? 'অনুমতি' : 'Permissions'}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(perms).map(([k, v]) => (
              <label key={k} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm"><input type="checkbox" checked={v} onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })} className="h-5 w-5 accent-primary" />{k.replace('can', '').replace(/([A-Z])/g, ' $1')}</label>
            ))}
          </div>
        </fieldset>
        <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-5 font-semibold text-white"><Plus className="h-5 w-5 inline" /> Add moderator</button>
      </form>
      <div className="mt-3 space-y-2">
        {mods.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
            <div className="flex-1"><p className="font-bold">{m.name}</p><p className="text-sm text-muted">{m.email}</p><p className="text-xs text-muted">{Object.entries(m).filter(([k, v]) => k.startsWith('can') && v).map(([k]) => k.replace('can', '')).join(', ') || 'No permissions'}</p></div>
            <button onClick={() => { deleteModerator(m.id); toast.info(lang === 'bn' ? 'মডারেটর মোছা হয়েছে' : 'Moderator removed'); onChange() }} className="flex h-11 w-11 items-center justify-center rounded-lg border text-red-600" aria-label="Remove moderator"><Trash2 className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

function SiteSettings({ user, onChange }) {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const s = getSettings()
  const [commission, setCommission] = useState(Math.round(s.commissionRate * 100))
  const [dhaka, setDhaka] = useState(s.shippingDhaka)
  const [outside, setOutside] = useState(s.shippingOutsideDhaka)
  const [freeAbove, setFreeAbove] = useState(s.freeShippingAbove)
  const save = (e) => {
    e.preventDefault()
    saveSettings({ commissionRate: Number(commission) / 100, shippingDhaka: Number(dhaka), shippingOutsideDhaka: Number(outside), freeShippingAbove: Number(freeAbove) })
    addAudit({ actor: user?.name, role: user?.role, action: `Updated website settings (commission ${commission}%, shipping ${dhaka}/${outside}, free above ${freeAbove})`, target: 'settings' })
    toast.success(lang === 'bn' ? 'সেটিংস সংরক্ষিত হয়েছে!' : 'Settings saved!'); onChange()
  }
  const inputCls = 'mt-1 h-11 w-full rounded-lg border px-3'
  return (
    <form onSubmit={save} className="mt-4 rounded-xl border bg-white p-4 space-y-3">
      <h2 className="font-bold text-lg">{t('websiteSettings')}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="text-sm font-medium" htmlFor="set-comm">{t('commission')} (%)</label><input id="set-comm" type="number" min="0" max="50" value={commission} onChange={(e) => setCommission(e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium" htmlFor="set-free">Free shipping above (৳)</label><input id="set-free" type="number" min="0" value={freeAbove} onChange={(e) => setFreeAbove(e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium" htmlFor="set-dhaka">{t('dhaka')} shipping (৳)</label><input id="set-dhaka" type="number" min="0" value={dhaka} onChange={(e) => setDhaka(e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm font-medium" htmlFor="set-out">{t('outsideDhaka')} shipping (৳)</label><input id="set-out" type="number" min="0" value={outside} onChange={(e) => setOutside(e.target.value)} className={inputCls} /></div>
      </div>
      <button type="submit" className="min-h-[44px] rounded-lg bg-primary px-6 font-semibold text-white">{t('save')}</button>
    </form>
  )
}

function Reports({ orders, sellerOrders, revenue }) {
  const { t, lang } = useLanguage()
  const download = () => {
    const rows = [['order_id', 'customer', 'total', 'payment', 'status', 'date'], ...orders.map((o) => [o.id, o.customerName, o.total, o.paymentMethod, o.status, o.createdAt])]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'sp-marketplace-orders.csv'
    a.click()
  }
  return (
    <div className="mt-4 rounded-xl border bg-white p-4">
      <h2 className="font-bold text-lg">{t('reports')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-surface p-3"><p className="text-sm text-muted">{t('revenue')}</p><p className="text-xl font-extrabold">{formatTaka(revenue)}</p></div>
        <div className="rounded-lg bg-surface p-3"><p className="text-sm text-muted">{t('totalOrders')}</p><p className="text-xl font-extrabold">{orders.length}</p></div>
        <div className="rounded-lg bg-surface p-3"><p className="text-sm text-muted">{t('commissions')}</p><p className="text-xl font-extrabold">{formatTaka(sellerOrders.reduce((s, o) => s + o.commission, 0))}</p></div>
      </div>
      <button onClick={download} className="mt-4 min-h-[44px] rounded-lg bg-primary px-5 font-semibold text-white">{lang === 'bn' ? 'অর্ডার রিপোর্ট ডাউনলোড (CSV)' : 'Download orders report (CSV)'}</button>
    </div>
  )
}

function AuditLog() {
  const { t, lang } = useLanguage()
  const logs = getAuditLogs()
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-bold text-lg">{t('auditLogs')} ({logs.length})</h2>
      {logs.length === 0 && <EmptyState icon={ShieldCheck} title={lang === 'bn' ? 'এখনো কোনো অডিট এন্ট্রি নেই' : 'No audit entries yet'} text={lang === 'bn' ? 'অ্যাডমিন/সেলার কোনো পরিবর্তন করলে এখানে লগ হবে।' : 'Admin/seller changes will be logged here.'} />}
      {logs.map((l) => (
        <div key={l.id} className="rounded-xl border bg-white p-3 text-sm">
          <p className="font-semibold">{l.action}</p>
          <p className="text-muted">{l.actor} ({l.role}) · {timeAgo(l.createdAt)} · {l.target}</p>
        </div>
      ))}
    </div>
  )
}
