import { useLanguage } from '../context/LanguageContext'
import SEO from '../components/SEO'

export default function Privacy() {
  const { t, lang } = useLanguage()
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6 prose-like">
      <SEO title={t('privacy')} />
      <h1 className="text-2xl font-extrabold">{t('privacy')}</h1>
      <div className="mt-4 space-y-4 text-gray-700 leading-relaxed">
        <p>{lang === 'bn' ? 'এসপি মার্কেটপ্লেস আপনার ব্যক্তিগত তথ্যের গোপনীয়তাকে গুরুত্ব দেয়।' : 'SP Marketplace takes the privacy of your personal information seriously.'}</p>
        <h2 className="text-lg font-bold text-ink">{lang === 'bn' ? 'আমরা কী তথ্য সংগ্রহ করি' : 'What we collect'}</h2>
        <p>{lang === 'bn' ? 'নাম, ইমেইল, ফোন নম্বর, ডেলিভারির ঠিকানা ও অর্ডারের তথ্য — শুধু অর্ডার প্রসেস ও ডেলিভারির জন্য।' : 'Name, email, phone number, delivery address and order details — only to process and deliver orders.'}</p>
        <h2 className="text-lg font-bold text-ink">{lang === 'bn' ? 'পেমেন্ট তথ্য' : 'Payment information'}</h2>
        <p>{lang === 'bn' ? 'কার্ড নম্বর, CVV বা পিন কখনো আমাদের সার্ভারে সংরক্ষণ করা হয় না। পেমেন্ট নিরাপদ গেটওয়ে দিয়ে প্রসেস হয়। বিকাশ/নগদ লেনদেনের ক্ষেত্রে শুধু TrxID সংরক্ষণ করা হয় যাচাইয়ের জন্য।' : 'Card numbers, CVV or PINs are never stored on our servers. Payments are processed through a secure gateway. For bKash/Nagad only the TrxID is stored, for verification.'}</p>
        <h2 className="text-lg font-bold text-ink">{lang === 'bn' ? 'তথ্য শেয়ার' : 'Sharing'}</h2>
        <p>{lang === 'bn' ? 'আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করা হয় না। ডেলিভারির জন্য শুধু প্রয়োজনীয় তথ্য কুরিয়ার পার্টনারের সঙ্গে শেয়ার করা হয়।' : 'Your data is never sold to third parties. Only the information needed for delivery is shared with courier partners.'}</p>
        <h2 className="text-lg font-bold text-ink">{lang === 'bn' ? 'আপনার অধিকার' : 'Your rights'}</h2>
        <p>{lang === 'bn' ? 'যেকোনো সময় আপনার অ্যাকাউন্টের তথ্য দেখতে, সংশোধন করতে বা মুছে ফেলার অনুরোধ করতে পারেন — support@spmarketplace.demo-তে লিখুন।' : 'You can view, correct or request deletion of your account data at any time — write to support@spmarketplace.demo.'}</p>
      </div>
    </div>
  )
}
