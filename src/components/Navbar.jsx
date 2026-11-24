import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Heart, User, Menu, X, Globe, LogOut, LayoutDashboard, Store, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { isDemoMode } from '../lib/firebase'
import { getCategories } from '../lib/firestore'

export default function Navbar() {
  const { lang, setLang, t } = useLanguage()
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { ids } = useWishlist()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const navigate = useNavigate()

  const submitSearch = (e) => { e.preventDefault(); if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setOpen(false) } }
  const dashboardLink = user?.role === 'admin' || user?.role === 'moderator' ? '/admin' : user?.role === 'seller' ? '/seller' : '/profile'

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {isDemoMode && (
        <div className="bg-amber-100 text-amber-900 text-center text-xs font-semibold px-2 py-1.5" role="note">
          {t('demoMode')} · admin@sp.demo / admin123 · seller@sp.demo / seller123 · customer@sp.demo / customer123
        </div>
      )}
      <div className="mx-auto max-w-7xl px-3 sm:px-4">
        <div className="flex h-16 items-center gap-2 sm:gap-4">
          <button className="lg:hidden p-2 min-h-[44px] min-w-[44px]" onClick={() => setMenu(!menu)} aria-label="Menu" aria-expanded={menu}>
            {menu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="SP Marketplace home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">SP</span>
            <span className="hidden sm:block leading-tight">
              <span className="block text-lg font-extrabold text-primary">SP Marketplace</span>
              <span className="block text-[11px] text-muted">এসপি মার্কেটপ্লেস · Bangladesh</span>
            </span>
          </Link>
          <form onSubmit={submitSearch} className="hidden md:flex flex-1 max-w-xl mx-auto" role="search">
            <label htmlFor="nav-search" className="sr-only">{t('searchPlaceholder')}</label>
            <input id="nav-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} className="h-11 flex-1 rounded-l-lg border border-gray-300 px-3 focus:border-primary focus:outline-none" />
            <button type="submit" className="flex h-11 min-w-[44px] items-center gap-1 rounded-r-lg bg-primary px-4 font-semibold text-white hover:bg-primary-dark"><Search className="h-5 w-5" /><span className="hidden lg:inline">{t('search')}</span></button>
          </form>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')} className="flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-semibold hover:bg-surface" aria-label="Switch language">
              <Globe className="h-5 w-5 text-primary" />{lang === 'bn' ? 'EN' : 'বাং'}
            </button>
            <Link to="/wishlist" className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-surface" aria-label={t('wishlist')}>
              <Heart className="h-6 w-6" />
              {ids.length > 0 && <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">{ids.length}</span>}
            </Link>
            <Link to="/cart" className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-surface" aria-label={t('cart')}>
              <ShoppingCart className="h-6 w-6" />
              {count > 0 && <span className="absolute top-0 right-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">{count}</span>}
            </Link>
            {user ? (
              <div className="relative">
                <button onClick={() => setOpen(!open)} className="flex min-h-[44px] items-center gap-2 rounded-lg px-2 hover:bg-surface" aria-haspopup="true" aria-expanded={open}>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light font-bold text-primary">{user.name?.[0]?.toUpperCase()}</span>
                  <span className="hidden lg:block text-sm font-semibold max-w-28 truncate">{user.name}</span>
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-lg py-2 z-50" role="menu">
                    <Link to={dashboardLink} onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 px-4 hover:bg-surface"><LayoutDashboard className="h-5 w-5 text-primary" />{t('dashboard')}</Link>
                    <Link to="/orders" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 px-4 hover:bg-surface"><ShoppingCart className="h-5 w-5 text-primary" />{t('orders')}</Link>
                    <Link to="/profile" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 px-4 hover:bg-surface"><User className="h-5 w-5 text-primary" />{t('profile')}</Link>
                    {(user.role === 'seller') && <Link to="/seller" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 px-4 hover:bg-surface"><Store className="h-5 w-5 text-primary" />{t('sellerDashboard')}</Link>}
                    {(user.role === 'admin' || user.role === 'moderator') && <Link to="/admin" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center gap-2 px-4 hover:bg-surface"><ShieldCheck className="h-5 w-5 text-primary" />{t('adminDashboard')}</Link>}
                    <button onClick={() => { logout(); setOpen(false) }} className="flex min-h-[44px] w-full items-center gap-2 px-4 text-left text-red-600 hover:bg-surface"><LogOut className="h-5 w-5" />{t('logout')}</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex min-h-[44px] items-center gap-1 rounded-lg bg-primary px-3 sm:px-4 font-semibold text-white hover:bg-primary-dark"><User className="h-5 w-5" /><span className="hidden sm:inline">{t('login')}</span></Link>
            )}
          </div>
        </div>
        <form onSubmit={submitSearch} className="md:hidden pb-3" role="search">
          <label htmlFor="nav-search-m" className="sr-only">{t('searchPlaceholder')}</label>
          <div className="flex">
            <input id="nav-search-m" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchPlaceholder')} className="h-11 flex-1 rounded-l-lg border border-gray-300 px-3 focus:border-primary focus:outline-none" />
            <button type="submit" className="flex h-11 min-w-[44px] items-center justify-center rounded-r-lg bg-primary px-3 text-white" aria-label={t('search')}><Search className="h-5 w-5" /></button>
          </div>
        </form>
      </div>
      <nav className="hidden lg:block border-t bg-white" aria-label="Categories">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4">
          <NavLink to="/" className={({ isActive }) => `px-3 py-2.5 text-sm font-semibold ${isActive ? 'text-primary' : 'hover:text-primary'}`}>{t('home')}</NavLink>
          <NavLink to="/products" className={({ isActive }) => `px-3 py-2.5 text-sm font-semibold ${isActive ? 'text-primary' : 'hover:text-primary'}`}>{t('products')}</NavLink>
          {getCategories().map((c) => (
            <NavLink key={c.slug} to={`/category/${c.slug}`} className={({ isActive }) => `px-3 py-2.5 text-sm font-medium ${isActive ? 'text-primary' : 'hover:text-primary'}`}>{lang === 'bn' ? c.nameBn : c.name}</NavLink>
          ))}
        </div>
      </nav>
      {menu && (
        <nav className="lg:hidden border-t bg-white px-4 py-2" aria-label="Mobile menu">
          <NavLink to="/" onClick={() => setMenu(false)} className="block min-h-[44px] py-2.5 font-semibold">{t('home')}</NavLink>
          <NavLink to="/products" onClick={() => setMenu(false)} className="block min-h-[44px] py-2.5 font-semibold">{t('products')}</NavLink>
          {getCategories().map((c) => (
            <NavLink key={c.slug} to={`/category/${c.slug}`} onClick={() => setMenu(false)} className="block min-h-[44px] py-2.5">{lang === 'bn' ? c.nameBn : c.name}</NavLink>
          ))}
          <NavLink to="/seller/register" onClick={() => setMenu(false)} className="block min-h-[44px] py-2.5 font-semibold text-primary">{t('becomeSeller')}</NavLink>
        </nav>
      )}
    </header>
  )
}
