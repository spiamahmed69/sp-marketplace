import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send, MapPin, Phone, Mail, Facebook, Youtube, Instagram } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { CATEGORIES } from '../data/demo'

export default function Footer() {
  const { lang, t } = useLanguage()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const subscribe = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error('Please enter a valid email address.'); return }
    setEmail('')
    toast.success(t('subscribed'))
  }
  return (
    <footer className="mt-12 bg-ink text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg font-extrabold text-white">SP</span>
              <span className="text-lg font-extrabold text-white">SP Marketplace</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{t('footerAbout')}</p>
            <p className="mt-3 text-sm flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> Dhaka, Bangladesh</p>
            <p className="mt-1 text-sm flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> +880 1XXX-XXXXXX</p>
            <p className="mt-1 text-sm flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> support@spmarketplace.demo</p>
            <div className="mt-3 flex gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-primary"><Facebook className="h-5 w-5" /></a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-primary"><Youtube className="h-5 w-5" /></a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-primary"><Instagram className="h-5 w-5" /></a>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white">{t('quickLinks')}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link className="hover:text-white min-h-[32px] inline-block" to="/products">{t('products')}</Link></li>
              <li><Link className="hover:text-white min-h-[32px] inline-block" to="/about">{t('aboutUs')}</Link></li>
              <li><Link className="hover:text-white min-h-[32px] inline-block" to="/faq">{t('faq')}</Link></li>
              <li><Link className="hover:text-white min-h-[32px] inline-block" to="/seller/register">{t('becomeSeller')}</Link></li>
              <li><Link className="hover:text-white min-h-[32px] inline-block" to="/orders">{t('trackOrder')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white">{t('categories')}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.slug}><Link className="hover:text-white min-h-[32px] inline-block" to={`/category/${c.slug}`}>{lang === 'bn' ? c.nameBn : c.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white">{t('newsletterTitle')}</h3>
            <p className="mt-3 text-sm">{t('newsletterText')}</p>
            <form onSubmit={subscribe} className="mt-3 flex">
              <label htmlFor="footer-email" className="sr-only">Email</label>
              <input id="footer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 flex-1 rounded-l-lg border border-gray-600 bg-white/10 px-3 text-white placeholder:text-gray-400 focus:outline-none" />
              <button type="submit" className="flex h-11 min-w-[44px] items-center justify-center rounded-r-lg bg-primary px-3 text-white hover:bg-primary-dark" aria-label={t('subscribe')}><Send className="h-5 w-5" /></button>
            </form>
            <p className="mt-3 text-sm"><Link className="hover:text-white" to="/privacy">{t('privacy')}</Link> · <Link className="hover:text-white" to="/terms">{t('terms')}</Link></p>
          </div>
        </div>
        <div className="mt-8 border-t border-white/10 pt-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} SP Marketplace · {t('allRights')} · {t('demoMode')}
        </div>
      </div>
    </footer>
  )
}
