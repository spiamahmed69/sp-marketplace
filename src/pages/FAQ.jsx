import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import SEO from '../components/SEO'

const FAQS = [
  { qBn: 'ডেলিভারি চার্জ কত?', qEn: 'What is the delivery charge?', aBn: 'ঢাকার ভেতরে ৳৬০, ঢাকার বাইরে ৳১২০। ৳১,৫০০ বা তার বেশি অর্ডারে ডেলিভারি সম্পূর্ণ ফ্রি।', aEn: '৳60 inside Dhaka and ৳120 outside Dhaka. Delivery is FREE on orders of ৳1,500 or more.' },
  { qBn: 'কীভাবে পেমেন্ট করব?', qEn: 'How can I pay?', aBn: 'ক্যাশ অন ডেলিভারি (COD), বিকাশ, নগদ অথবা কার্ড দিয়ে পেমেন্ট করতে পারবেন। বিকাশ/নগদে পেমেন্টের পর TrxID দিতে হয় — আমাদের টিম যাচাই করে নিশ্চিত করে।', aEn: 'You can pay with Cash on Delivery, bKash, Nagad or card. For bKash/Nagad, enter your TrxID after payment — our team verifies it manually.' },
  { qBn: 'পণ্য ফেরত দেওয়া যায় কি?', qEn: 'Can I return a product?', aBn: 'হ্যাঁ — ত্রুটিপূর্ণ বা ভুল পণ্য পেলে ৭ দিনের মধ্যে রিটার্ন করা যায়।', aEn: 'Yes — faulty or wrong products can be returned within 7 days.' },
  { qBn: 'আমি কীভাবে সেলার হব?', qEn: 'How do I become a seller?', aBn: '"সেলার হোন" পেজে রেজিস্ট্রেশন করে স্টোর তৈরি করুন। অ্যাডমিন অনুমোদন দিলে আপনি পণ্য বিক্রি শুরু করতে পারবেন।', aEn: 'Register on the "Become a Seller" page and create your store. Once an admin approves it, you can start selling.' },
  { qBn: 'অর্ডার কীভাবে ট্র্যাক করব?', qEn: 'How do I track my order?', aBn: '"অর্ডার ট্র্যাক" পেজে আপনার অর্ডার আইডি দিলে বর্তমান অবস্থা দেখতে পাবেন।', aEn: 'Enter your order ID on the "Track Order" page to see the current status.' },
  { qBn: 'আমার কার্ডের তথ্য কি নিরাপদ?', qEn: 'Is my card information safe?', aBn: 'হ্যাঁ — কার্ড নম্বর আমাদের সার্ভারে কখনো সংরক্ষণ করা হয় না। পেমেন্ট নিরাপদ গেটওয়ে দিয়ে প্রসেস হয়।', aEn: 'Yes — card numbers are never stored on our servers. Payments are processed through a secure gateway.' },
]

export default function FAQ() {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(0)
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6">
      <SEO title={t('faq')} />
      <h1 className="text-2xl font-extrabold">{t('faq')}</h1>
      <div className="mt-4 space-y-2">
        {FAQS.map((f, i) => (
          <div key={i} className="rounded-xl border bg-white overflow-hidden">
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-4 text-left font-semibold">
              {lang === 'bn' ? f.qBn : f.qEn}
              <ChevronDown className={`h-5 w-5 shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <p className="px-4 pb-4 text-sm leading-relaxed text-gray-700">{lang === 'bn' ? f.aBn : f.aEn}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
