import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Banknote, Smartphone, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getProducts, getSettings, createOrder } from '../lib/firestore'
import { formatTaka } from '../lib/format'
import SEO from '../components/SEO'
import ProductImage from '../components/ProductImage'

const addressSchema = z.object({
  name: z.string().min(3, 'Name is required (min 3 characters)'),
  phone: z.string().regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number (e.g. 01XXXXXXXXX)'),
  address: z.string().min(8, 'Full address is required'),
  city: z.string().min(2, 'City / district is required'),
  division: z.enum(['dhaka', 'outside']),
})

export default function Checkout() {
  const { lang, t } = useLanguage()
  const { items, clear } = useCart()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const coupon = location.state?.coupon || null
  const settings = getSettings()
  const [method, setMethod] = useState('cod')
  const [txnId, setTxnId] = useState('')
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' })
  const [submitting, setSubmitting] = useState(false)
  const [placed, setPlaced] = useState(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(addressSchema),
    defaultValues: { name: user?.name || '', phone: '', address: '', city: '', division: 'dhaka' },
  })
  const division = watch('division')

  const detailed = items.map((it) => ({ ...it, product: getProducts().find((p) => p.id === it.productId) })).filter((it) => it.product && !it.product.deleted)
  const subtotal = detailed.reduce((s, it) => s + it.product.price * it.qty, 0)
  const discount = coupon ? Math.round(subtotal * (coupon.discountPercent / 100)) : 0
  const shipping = subtotal === 0 ? 0 : (subtotal - discount >= settings.freeShippingAbove ? 0 : (division === 'dhaka' ? settings.shippingDhaka : settings.shippingOutsideDhaka))
  const total = subtotal - discount + shipping

  const onSubmit = async (address) => {
    if (detailed.length === 0) { toast.error(t('emptyCart')); return }
    if ((method === 'bkash' || method === 'nagad') && !txnId.trim()) { toast.error(lang === 'bn' ? 'TrxID দিন।' : 'Please enter the Transaction ID.'); return }
    if (method === 'card') {
      const digits = card.number.replace(/\D/g, '')
      if (digits.length < 15 || digits.length > 16) { toast.error(lang === 'bn' ? 'সঠিক কার্ড নম্বর দিন।' : 'Enter a valid card number.'); return }
      if (!/^\d{2}\/\d{2}$/.test(card.expiry) || card.cvc.length < 3) { toast.error(lang === 'bn' ? 'মেয়াদ ও CVC সঠিকভাবে দিন।' : 'Enter valid expiry and CVC.'); return }
    }
    setSubmitting(true) // button disabled while submitting — prevents duplicate orders
    try {
      await new Promise((r) => setTimeout(r, 600))
      const payment = {
        method,
        txnId: (method === 'bkash' || method === 'nagad') ? txnId.trim() : '',
        // Card: only the last 4 digits are recorded. The full number is NEVER
        // stored — it goes only to the payment gateway (see DEPLOYMENT.md).
        cardLast4: method === 'card' ? card.number.replace(/\D/g, '').slice(-4) : '',
      }
      const { parent } = createOrder({ customer: user, items: detailed, address, payment, coupon })
      clear()
      setPlaced(parent)
      toast.success(t('orderPlaced'))
    } catch (err) {
      toast.error(err.message)
    } finally { setSubmitting(false) }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <SEO title={t('orderPlaced')} />
        <CheckCircle2 className="h-16 w-16 mx-auto text-success" />
        <h1 className="mt-4 text-2xl font-extrabold">{t('orderPlaced')}</h1>
        <p className="mt-2 text-muted">{t('thankYou')}</p>
        <div className="mt-6 rounded-xl border bg-white p-5 text-left space-y-2">
          <p><span className="font-semibold">{t('orderId')}:</span> {placed.id}</p>
          <p><span className="font-semibold">{t('total')}:</span> <span className="font-bold text-primary">{formatTaka(placed.total)}</span></p>
          <p><span className="font-semibold">{t('paymentMethod')}:</span> {placed.paymentMethod.toUpperCase()} {placed.txnId && `· TrxID: ${placed.txnId}`}</p>
          <p className="text-sm text-muted">{placed.paymentMethod === 'cod' ? 'Pay in cash when your order arrives.' : 'Your payment will be verified manually by our team.'}</p>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button onClick={() => navigate(`/track/${placed.id}`)} className="min-h-[48px] rounded-lg bg-primary px-6 font-bold text-white">{t('trackOrder')}</button>
          <button onClick={() => navigate('/orders')} className="min-h-[48px] rounded-lg border px-6 font-semibold">{t('orders')}</button>
          <button onClick={() => navigate('/')} className="min-h-[48px] rounded-lg border px-6 font-semibold">{t('home')}</button>
        </div>
      </div>
    )
  }

  if (detailed.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-2xl font-extrabold">{t('emptyCart')}</h1>
        <button onClick={() => navigate('/products')} className="mt-4 min-h-[48px] rounded-lg bg-primary px-6 font-bold text-white">{t('continueShopping')}</button>
      </div>
    )
  }

  const inputCls = 'h-11 w-full rounded-lg border px-3 focus:border-primary focus:outline-none'
  const err = (name) => errors[name] && <p className="mt-1 text-sm text-red-600" role="alert">{errors[name].message}</p>

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
      <SEO title={t('checkout')} />
      <h1 className="text-2xl font-extrabold">{t('checkout')}</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border bg-white p-4 sm:p-5" aria-label={t('deliveryAddress')}>
            <h2 className="font-bold text-lg">{t('deliveryAddress')}</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><label className="text-sm font-medium" htmlFor="co-name">{t('name')}</label><input id="co-name" {...register('name')} className={inputCls} />{err('name')}</div>
              <div><label className="text-sm font-medium" htmlFor="co-phone">{t('phone')}</label><input id="co-phone" {...register('phone')} placeholder="01XXXXXXXXX" className={inputCls} />{err('phone')}</div>
              <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="co-address">{t('address')}</label><input id="co-address" {...register('address')} placeholder="House, Road, Area" className={inputCls} />{err('address')}</div>
              <div><label className="text-sm font-medium" htmlFor="co-city">{t('city')}</label><input id="co-city" {...register('city')} placeholder="Dhaka" className={inputCls} />{err('city')}</div>
              <div>
                <label className="text-sm font-medium" htmlFor="co-division">{t('division')}</label>
                <select id="co-division" {...register('division')} className={inputCls}>
                  <option value="dhaka">{t('dhaka')} — {formatTaka(settings.shippingDhaka)}</option>
                  <option value="outside">{t('outsideDhaka')} — {formatTaka(settings.shippingOutsideDhaka)}</option>
                </select>
                {err('division')}
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-white p-4 sm:p-5" aria-label={t('paymentMethod')}>
            <h2 className="font-bold text-lg">{t('paymentMethod')}</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
              {[
                { id: 'cod', icon: Banknote, label: t('codFull') },
                { id: 'bkash', icon: Smartphone, label: 'bKash' },
                { id: 'nagad', icon: Smartphone, label: 'Nagad' },
                { id: 'card', icon: CreditCard, label: t('card') },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} type="button" role="radio" aria-checked={method === id} onClick={() => setMethod(id)} className={`flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-4 font-semibold text-left ${method === id ? 'border-primary bg-primary-light text-primary' : 'border-gray-200 hover:border-primary'}`}>
                  <Icon className="h-6 w-6" />{label}
                </button>
              ))}
            </div>

            {(method === 'bkash' || method === 'nagad') && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
                <p className="flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />{t('txnHelp')}</p>
                <p className="mt-1 font-semibold">Send to: {method === 'bkash' ? settings.bkashMerchant : settings.nagadMerchant} · {formatTaka(total)}</p>
                <label className="mt-3 block font-medium" htmlFor="txn">{t('txnId')}</label>
                <input id="txn" value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. 9HX7K2LMNP" className={`${inputCls} mt-1 bg-white`} />
              </div>
            )}
            {method === 'card' && (
              <div className="mt-4 rounded-lg border p-3">
                <p className="text-sm text-muted flex gap-2"><AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />{t('cardNote')}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2"><label className="text-sm font-medium" htmlFor="card-num">{t('cardNumber')}</label><input id="card-num" inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" className={`${inputCls} mt-1`} /></div>
                  <div><label className="text-sm font-medium" htmlFor="card-exp">{t('expiry')}</label><input id="card-exp" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="12/28" className={`${inputCls} mt-1`} /></div>
                  <div><label className="text-sm font-medium" htmlFor="card-cvc">{t('cvc')}</label><input id="card-cvc" inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} placeholder="123" className={`${inputCls} mt-1`} /></div>
                </div>
                <p className="mt-2 text-xs text-muted">Demo: use 4242 4242 4242 4242 — no real charge is made in Demo Mode.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border bg-white p-4 lg:sticky lg:top-24" aria-label={t('orderSummary')}>
          <h2 className="font-bold text-lg">{t('orderSummary')}</h2>
          <div className="mt-3 space-y-3">
            {detailed.map((it) => (
              <div key={it.key} className="flex items-center gap-3">
                <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface"><ProductImage src={it.product.images?.[0]} alt={it.product.name} className="h-full w-full object-cover" /></span>
                <span className="flex-1 min-w-0 text-sm"><span className="block truncate font-medium">{lang === 'bn' ? it.product.nameBn : it.product.name}</span><span className="text-muted">× {it.qty}</span></span>
                <span className="text-sm font-bold whitespace-nowrap">{formatTaka(it.product.price * it.qty)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>{t('subtotal')}</span><span className="font-semibold">{formatTaka(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-success"><span>{t('discount')} ({coupon.code})</span><span>−{formatTaka(discount)}</span></div>}
            <div className="flex justify-between"><span>{t('shipping')}</span><span className="font-semibold">{shipping === 0 ? (lang === 'bn' ? 'ফ্রি' : 'FREE') : formatTaka(shipping)}</span></div>
            <div className="flex justify-between border-t pt-2 text-base font-extrabold"><span>{t('total')}</span><span className="text-primary">{formatTaka(total)}</span></div>
          </div>
          <button type="submit" disabled={submitting} className="mt-4 min-h-[48px] w-full rounded-lg bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-60">
            {submitting ? t('placingOrder') : `${t('placeOrder')} · ${formatTaka(total)}`}
          </button>
          <p className="mt-2 text-xs text-muted text-center">Demo Mode: no real payment is processed. bKash/Nagad orders await manual TrxID verification.</p>
        </aside>
      </form>
    </div>
  )
}
