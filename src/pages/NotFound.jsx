import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import SEO from '../components/SEO'

export default function NotFound() {
  const { t } = useLanguage()
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <SEO title="404" />
      <SearchX className="h-14 w-14 mx-auto text-primary" />
      <h1 className="mt-4 text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-muted">This page could not be found.</p>
      <Link to="/" className="mt-6 inline-flex min-h-[48px] items-center rounded-lg bg-primary px-6 font-bold text-white">{t('home')}</Link>
    </div>
  )
}
