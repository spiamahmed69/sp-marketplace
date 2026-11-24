import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import SEO from '../components/SEO'

const schema = z.object({
  name: z.string().min(3, 'Name is required (min 3 characters)'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

export default function Register() {
  const { t, lang } = useLanguage()
  const { register: doRegister, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const [error, setError] = useState('')
  const onSubmit = async (data) => {
    setError('')
    try {
      const u = await doRegister(data)
      toast.success(lang === 'bn' ? `অ্যাকাউন্ট তৈরি হয়েছে, ${u.name}!` : `Account created, ${u.name}!`)
      navigate('/')
    } catch (e) { setError(e.message) }
  }
  const inputCls = 'h-11 w-full rounded-lg border px-3 focus:border-primary focus:outline-none'
  const err = (n) => errors[n] && <p className="mt-1 text-sm text-red-600" role="alert">{errors[n].message}</p>
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <SEO title={t('register')} />
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><UserPlus className="h-7 w-7 text-primary" />{t('registerTitle')}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div><label className="text-sm font-medium" htmlFor="reg-name">{t('name')}</label><input id="reg-name" {...register('name')} className={`${inputCls} mt-1`} />{err('name')}</div>
          <div><label className="text-sm font-medium" htmlFor="reg-email">{t('email')}</label><input id="reg-email" type="email" {...register('email')} className={`${inputCls} mt-1`} />{err('email')}</div>
          <div><label className="text-sm font-medium" htmlFor="reg-password">{t('password')}</label><input id="reg-password" type="password" {...register('password')} className={`${inputCls} mt-1`} />{err('password')}</div>
          <div><label className="text-sm font-medium" htmlFor="reg-confirm">{t('confirmPassword')}</label><input id="reg-confirm" type="password" {...register('confirmPassword')} className={`${inputCls} mt-1`} />{err('confirmPassword')}</div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="min-h-[48px] w-full rounded-lg bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-60">{loading ? '…' : t('register')}</button>
        </form>
        <p className="mt-4 text-center text-sm">{t('haveAccount')} <Link to="/login" className="font-semibold text-primary">{t('login')}</Link></p>
        <p className="mt-3 text-center text-sm text-muted"><Link to="/seller/register" className="font-semibold text-primary">{t('becomeSeller')}</Link></p>
      </div>
    </div>
  )
}
