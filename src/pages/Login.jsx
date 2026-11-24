import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { DEMO_USERS } from '../data/demo'
import SEO from '../components/SEO'

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default function Login() {
  const { t, lang } = useLanguage()
  const { login, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const [error, setError] = useState('')

  const onSubmit = async (data) => {
    setError('')
    try {
      const u = await login(data.email, data.password)
      toast.success(lang === 'bn' ? `স্বাগতম, ${u.name}!` : `Welcome back, ${u.name}!`)
      navigate(u.role === 'admin' || u.role === 'moderator' ? '/admin' : u.role === 'seller' ? '/seller' : from, { replace: true })
    } catch (e) { setError(e.message) }
  }
  const inputCls = 'h-11 w-full rounded-lg border px-3 focus:border-primary focus:outline-none'
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <SEO title={t('login')} />
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><LogIn className="h-7 w-7 text-primary" />{t('loginTitle')}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <div><label className="text-sm font-medium" htmlFor="login-email">{t('email')}</label><input id="login-email" type="email" {...register('email')} className={`${inputCls} mt-1`} />{errors.email && <p className="mt-1 text-sm text-red-600" role="alert">{errors.email.message}</p>}</div>
          <div><label className="text-sm font-medium" htmlFor="login-password">{t('password')}</label><input id="login-password" type="password" {...register('password')} className={`${inputCls} mt-1`} />{errors.password && <p className="mt-1 text-sm text-red-600" role="alert">{errors.password.message}</p>}</div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="min-h-[48px] w-full rounded-lg bg-primary font-bold text-white hover:bg-primary-dark disabled:opacity-60">{loading ? '…' : t('login')}</button>
        </form>
        <p className="mt-4 text-center text-sm">{t('dontHaveAccount')} <Link to="/register" className="font-semibold text-primary">{t('register')}</Link></p>
        <div className="mt-6 rounded-xl bg-surface p-4">
          <p className="text-sm font-bold">{t('demoAccounts')}</p>
          <div className="mt-2 grid gap-2">
            {DEMO_USERS.map((u) => (
              <button key={u.email} type="button" onClick={() => { setValue('email', u.email); setValue('password', u.password) }} className="flex min-h-[44px] items-center justify-between rounded-lg border bg-white px-3 text-left text-sm hover:border-primary">
                <span><span className="font-semibold">{u.role}</span> — {u.email}</span><span className="text-muted">{u.password}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
