import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Store } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SEO from '../components/SEO'

const schema = z.object({
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  storeName: z.string().min(3, 'Store name is required'),
  phone: z.string().regex(/^(?:\+?880|0)1[3-9]\d{8}$/, 'Enter a valid Bangladeshi mobile number'),
})

export default function SellerRegister() {
  const { t, lang } = useLanguage()
  const { registerSeller, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = async (data) => {
    setError(''); setLoading(true)
    try {
      await registerSeller(data)
      toast.success(lang === 'bn' ? 'স্টোর তৈরি হয়েছে! অ্যাডমিন অনুমোদনের অপেক্ষায়।' : 'Store created! Waiting for admin approval.')
      navigate('/seller')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  if (user?.role === 'seller') { navigate('/seller'); return null }
  const inputCls = 'h-11 w-full rounded-lg border px-3 focus:border-primary focus:outline-none'
  const err = (n) => errors[n] && <p className="mt-1 text-sm text-red-600" role="alert">{errors[n].message}</p>
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <SEO title={t('sellerRegister')} />
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Store className="h-7 w-7 text-primary" />{t('sellerRegister')}</h1>
        <p className="mt-2 text-sm text-muted">{lang === 'bn' ? 'স্টোর তৈরি করুন — অ্যাডমিন যাচাই করে অনুমোদন দিলে বিক্রি শুরু করতে পারবেন। প্ল্যাটফর্ম কমিশন ১০%।' : 'Create your store — start selling once an admin approves it. Platform commission is 10%.'}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div><label className="text-sm font-medium" htmlFor="sr-name">{t('name')}</label><input id="sr-name" {...register('name')} className={`${inputCls} mt-1`} />{err('name')}</div>
          <div><label className="text-sm font-medium" htmlFor="sr-email">{t('email')}</label><input id="sr-email" type="email" {...register('email')} className={`${inputCls} mt-1`} />{err('email')}</div>
          <div><label className="text-sm font-medium" htmlFor="sr-phone">{t('phone')}</label><input id="sr-phone" {...register('phone')} placeholder="01XXXXXXXXX" className={`${inputCls} mt-1`} />{err('phone')}</div>
          <div><label className="text-sm font-medium" htmlFor="sr-store">{t('storeName')}</label><input id="sr-store" {...register('storeName')} placeholder="My Store" className={`${inputCls} mt-1`} />{err('storeName')}</div>
          <div><label className="text-sm font-medium" htmlFor="sr-password">{t('password')}</label><input id="sr-password" type="password" {...register('password')} className={`${inputCls} mt-1`} />{err('password')}</div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="min-h-[48px] w-full rounded-lg bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-60">{loading ? '…' : t('sellerRegister')}</button>
        </form>
      </div>
    </div>
  )
}
