import { useLanguage } from '../context/LanguageContext'
import SEO from '../components/SEO'

export default function Terms() {
  const { t, lang } = useLanguage()
  return (
    <div className="mx-auto max-w-3xl px-3 sm:px-4 py-6">
      <SEO title={t('terms')} />
      <h1 className="text-2xl font-extrabold">{t('terms')}</h1>
      <div className="mt-4 space-y-4 text-gray-700 leading-relaxed">
        <h2 className="text-lg font-bold text-ink">1. {lang === 'bn' ? 'সাধারণ' : 'General'}</h2>
        <p>{lang === 'bn' ? 'এসপি মার্কেটপ্লেস ব্যবহার করে আপনি এই শর্তাবলিতে সম্মত হচ্ছেন। পণ্যের দাম ও স্টক যেকোনো সময় পরিবর্তিত হতে পারে।' : 'By using SP Marketplace you agree to these terms. Prices and stock may change at any time.'}</p>
        <h2 className="text-lg font-bold text-ink">2. {lang === 'bn' ? 'অর্ডার ও পেমেন্ট' : 'Orders & payment'}</h2>
        <p>{lang === 'bn' ? 'অর্ডার নিশ্চিত হওয়ার পর ক্যাশ অন ডেলিভারি, বিকাশ, নগদ বা কার্ডে পেমেন্ট করা যায়। বিকাশ/নগদ পেমেন্ট যাচাই সাপেক্ষে নিশ্চিত হয়।' : 'After an order is confirmed you can pay by Cash on Delivery, bKash, Nagad or card. bKash/Nagad payments are confirmed after verification.'}</p>
        <h2 className="text-lg font-bold text-ink">3. {lang === 'bn' ? 'রিটার্ন' : 'Returns'}</h2>
        <p>{lang === 'bn' ? 'ত্রুটিপূর্ণ বা ভুল পণ্য ৭ দিনের মধ্যে রিটার্ন করা যায়। ব্যবহৃত বা ক্ষতিগ্রস্ত পণ্য ফেরতযোগ্য নয়।' : 'Faulty or wrong products can be returned within 7 days. Used or damaged products are not returnable.'}</p>
        <h2 className="text-lg font-bold text-ink">4. {lang === 'bn' ? 'বিক্রেতা' : 'Sellers'}</h2>
        <p>{lang === 'bn' ? 'বিক্রেতারা শুধু নিজেদের স্টোর ও পণ্য পরিচালনা করতে পারেন। পণ্য প্রকাশের আগে অ্যাডমিন অনুমোদন প্রয়োজন। প্ল্যাটফর্ম কমিশন ১০%।' : 'Sellers may manage only their own store and products. Admin approval is required before a product goes live. Platform commission is 10%.'}</p>
        <h2 className="text-lg font-bold text-ink">5. {lang === 'bn' ? 'দায়বদ্ধতা' : 'Liability'}</h2>
        <p>{lang === 'bn' ? 'তৃতীয় পক্ষের (কুরিয়ার/পেমেন্ট গেটওয়ে) সেবায় বিলম্বের জন্য এসপি মার্কেটপ্লেস দায়ী নয়, তবে সমস্যা সমাধানে সর্বোচ্চ সহায়তা করা হয়।' : 'SP Marketplace is not liable for delays caused by third parties (couriers/payment gateways), but will help resolve any issue.'}</p>
      </div>
    </div>
  )
}
