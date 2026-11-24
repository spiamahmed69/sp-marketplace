import { NavLink } from 'react-router-dom'
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'

export default function MobileBottomNav() {
  const { t } = useLanguage()
  const { count } = useCart()
  const items = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/products', icon: LayoutGrid, label: t('products') },
    { to: '/cart', icon: ShoppingCart, label: t('cart'), badge: count },
    { to: '/wishlist', icon: Heart, label: t('wishlist') },
    { to: '/profile', icon: User, label: t('profile') },
  ]
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.06)] md:hidden" aria-label="Bottom navigation">
      <div className="grid grid-cols-5">
        {items.map(({ to, icon: Icon, label, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? 'text-primary' : 'text-gray-500'}`}>
            <Icon className="h-5 w-5" />
            {label}
            {badge > 0 && <span className="absolute top-1 right-1/2 translate-x-4 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{badge}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
