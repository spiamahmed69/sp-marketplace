import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import SEO from '../components/SEO'

const schema = z.object({
  name: z.string().min(3, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  subject: z.string().min(3, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export default function Contact() {
  const { t, lang } = useLanguage()
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = () => { setSent(true); reset(); toast.success(t('messageSent')) }
  const inputCls = 'h-11 w-full rounded-lg border px-3 focus:border-primary focus:outline-none'
  const err = (n) => errors[n] && <p className="mt-1 text-sm text-red-600" role="alert">{errors[n].message}</p>
  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6">
      <SEO title={t('contactUs')} />
      <h1 className="text-2xl font-extrabold">{t('contactUs')}</h1>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="rounded-xl border bg-white p-4 flex gap-3"><MapPin className="h-6 w-6 text-primary shrink-0" /><div><p className="font-bold">SP Marketplace</p><p className="text-sm text-muted">Dhaka, Bangladesh</p></div></div>
          <div className="rounded-xl border bg-white p-4 flex gap-3"><Phone className="h-6 w-6 text-primary shrink-0" /><div><p className="font-bold">+880 1XXX-XXXXXX</p><p className="text-sm text-muted">{lang === 'bn' ? 'সকাল ৯টা — রাত ৯টা' : '9 AM — 9 PM, every day'}</p></div></div>
          <div className="rounded-xl border bg-white p-4 flex gap-3"><Mail className="h-6 w-6 text-primary shrink-0" /><div><p className="font-bold">support@spmarketplace.demo</p><p className="text-sm text-muted">{lang === 'bn' ? '২৪ ঘণ্টার মধ্যে উত্তর দেওয়া হয়' : 'We reply within 24 hours'}</p></div></div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border bg-white p-5">
          {sent && <p className="mb-3 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800" role="status">{t('messageSent')}</p>}
          <div className="space-y-3">
            <div><label className="text-sm font-medium" htmlFor="ct-name">{t('name')}</label><input id="ct-name" {...register('name')} className={`${inputCls} mt-1`} />{err('name')}</div>
            <div><label className="text-sm font-medium" htmlFor="ct-email">{t('email')}</label><input id="ct-email" type="email" {...register('email')} className={`${inputCls} mt-1`} />{err('email')}</div>
            <div><label className="text-sm font-medium" htmlFor="ct-subject">{t('subject')}</label><input id="ct-subject" {...register('subject')} className={`${inputCls} mt-1`} />{err('subject')}</div>
            <div><label className="text-sm font-medium" htmlFor="ct-message">{t('message')}</label><textarea id="ct-message" rows={5} {...register('message')} className="mt-1 w-full rounded-lg border p-2" />{err('message')}</div>
            <button type="submit" className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-white hover:bg-primary-dark"><Send className="h-5 w-5" />{t('sendMessage')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
