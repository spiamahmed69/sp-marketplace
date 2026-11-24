import { ShieldCheck, Truck, Store, Users } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import SEO from '../components/SEO'

export default function About() {
  const { t, lang } = useLanguage()
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6">
      <SEO title={t('aboutUs')} />
      <h1 className="text-2xl font-extrabold">{t('aboutUs')}</h1>
      <p className="mt-3 leading-relaxed text-gray-700">
        {lang === 'bn'
          ? 'এসপি মার্কেটপ্লেস বাংলাদেশের একটি মাল্টি-ভেন্ডর অনলাইন শপিং প্ল্যাটফর্ম। আমাদের লক্ষ্য — দেশের যেকোনো প্রান্তের ক্রেতার কাছে মানসম্মত পণ্য সঠিক দামে পৌঁছে দেওয়া, আর ছোট-বড় সব বিক্রেতাকে অনলাইনে ব্যবসা করার সুযোগ করে দেওয়া।'
          : 'SP Marketplace is a multi-vendor online shopping platform for Bangladesh. Our mission is to bring quality products at fair prices to customers anywhere in the country — and to give sellers of every size a chance to grow online.'}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Store, n: '4+', bn: 'ফিচার্ড স্টোর', en: 'Featured stores' },
          { icon: Users, n: '10,000+', bn: 'সন্তুষ্ট কাস্টমার', en: 'Happy customers' },
          { icon: Truck, n: '64', bn: 'জেলায় ডেলিভারি', en: 'Districts served' },
          { icon: ShieldCheck, n: '100%', bn: 'নিরাপদ পেমেন্ট', en: 'Secure payments' },
        ].map(({ icon: Icon, n, bn, en }) => (
          <div key={en} className="rounded-xl border bg-white p-4 text-center">
            <Icon className="h-7 w-7 mx-auto text-primary" />
            <p className="mt-2 text-2xl font-extrabold">{n}</p>
            <p className="text-sm text-muted">{lang === 'bn' ? bn : en}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-xl font-extrabold">{lang === 'bn' ? 'আমরা কীভাবে কাজ করি' : 'How we work'}</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
        <li>{lang === 'bn' ? 'বিক্রেতারা স্টোর খুলে পণ্য যোগ করেন; অ্যাডমিন যাচাই করে অনুমোদন দেন।' : 'Sellers open a store and add products; an admin reviews and approves them.'}</li>
        <li>{lang === 'bn' ? 'কাস্টমার অর্ডার করলে প্রত্যেক সেলারের জন্য আলাদা সেলার অর্ডার তৈরি হয়।' : 'When a customer orders, a separate seller order is created for each seller.'}</li>
        <li>{lang === 'bn' ? 'পেমেন্ট যাচাই ও ডেলিভারির পর সেলার তার আয় পান (প্ল্যাটফর্ম কমিশন ১০%)।' : 'After payment verification and delivery, the seller receives earnings (10% platform commission).'}</li>
      </ol>
    </div>
  )
}
