import { createContext, useContext, useEffect, useState } from 'react'
import { t as translate } from '../lib/i18n'

const LanguageContext = createContext()
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('sp_lang') || 'bn')
  useEffect(() => { localStorage.setItem('sp_lang', lang); document.documentElement.lang = lang }, [lang])
  const t = (key) => translate(key, lang)
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}
export const useLanguage = () => useContext(LanguageContext)
