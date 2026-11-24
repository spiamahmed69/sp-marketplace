import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { User, ShoppingCart, Heart, Store, ShieldCheck, LogOut } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../context/ToastContext'
import { getOrders } from '../lib/firestore'
import SEO from '../components/SEO'

export default function Profile() {
  const { t, lang } = useLanguage()
  const { user, logout, updateProfile } = useAuth()
  const { count } = useCart()
  const { ids } = useWishlist()
  const toast = useToast()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  if (!user) return <Navigate to="/login" replace />
  const myOrders = getOrders().filter((o) => o.customerId === user.id || o.customerEmail === user.email)
  const save = (e) => { e.preventDefault(); updateProfile({ name, phone }); toast.success(lang === 'bn' ? 'প্রোফাইল আপডেট হয়েছে!' : 'Profile updated!') }
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6">
      <SEO title={t('profile')} />
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl font-extrabold text-primary">{user.name?.[0]?.toUpperCase()}</span>
        <div><h1 className="text-2xl font-extrabold">{user.name}</h1><p className="text-muted text-sm">{user.email} · {t(user.role)}</p></div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Link to="/orders" className="rounded-xl border bg-white p-4 text-center hover:border-primary"><ShoppingCart className="h-6 w-6 mx-auto text-primary" /><p className="mt-1 text-2xl font-extrabold">{myOrders.length}</p><p className="text-xs text-muted">{t('orders')}</p></Link>
        <Link to="/wishlist" className="rounded-xl border bg-white p-4 text-center hover:border-primary"><Heart className="h-6 w-6 mx-auto text-primary" /><p className="mt-1 text-2xl font-extrabold">{ids.length}</p><p className="text-xs text-muted">{t('wishlist')}</p></Link>
        <Link to="/cart" className="rounded-xl border bg-white p-4 text-center hover:border-primary"><ShoppingCart className="h-6 w-6 mx-auto text-primary" /><p className="mt-1 text-2xl font-extrabold">{count}</p><p className="text-xs text-muted">{t('cart')}</p></Link>
      </div>
      <form onSubmit={save} className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="font-bold text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary" />{t('profile')}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label className="text-sm font-medium" htmlFor="pf-name">{t('name')}</label><input id="pf-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 w-full rounded-lg border px-3" /></div>
          <div><label className="text-sm font-medium" htmlFor="pf-phone">{t('phone')}</label><input id="pf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" className="mt-1 h-11 w-full rounded-lg border px-3" /></div>
        </div>
        <button type="submit" className="mt-4 min-h-[44px] rounded-lg bg-primary px-6 font-semibold text-white">{t('save')}</button>
      </form>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link to="/orders" className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-white font-semibold hover:border-primary"><ShoppingCart className="h-5 w-5 text-primary" />{t('orders')}</Link>
        <Link to="/reviews" className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-white font-semibold hover:border-primary"><Heart className="h-5 w-5 text-primary" />{t('myReviews')}</Link>
        {user.role === 'seller' ? <Link to="/seller" className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-white font-semibold hover:border-primary"><Store className="h-5 w-5 text-primary" />{t('sellerDashboard')}</Link>
          : user.role === 'admin' || user.role === 'moderator' ? <Link to="/admin" className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-white font-semibold hover:border-primary"><ShieldCheck className="h-5 w-5 text-primary" />{t('adminDashboard')}</Link>
          : <Link to="/seller/register" className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border bg-white font-semibold hover:border-primary"><Store className="h-5 w-5 text-primary" />{t('becomeSeller')}</Link>}
      </div>
      <button onClick={logout} className="mt-4 flex min-h-[48px] items-center gap-2 rounded-lg border px-5 font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-5 w-5" />{t('logout')}</button>
    </div>
  )
}
