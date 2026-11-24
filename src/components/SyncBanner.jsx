// Banner shown in production mode when Firestore could not be reached:
// the shop keeps working from its local cache, but the data may be stale and
// new changes may not have been saved to the server. Hidden in Demo Mode.
import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, X } from 'lucide-react'
import { isDemoMode } from '../lib/firebase'
import { getSyncStatus, subscribeSync, syncFromFirestore } from '../lib/firestore'
import { useLanguage } from '../context/LanguageContext'

export default function SyncBanner() {
  const { lang } = useLanguage()
  const [status, setStatus] = useState(() => getSyncStatus())
  const [dismissed, setDismissed] = useState('')
  useEffect(() => subscribeSync(setStatus), [])

  if (isDemoMode) return null
  const broken = status.status === 'error' || !!status.lastWriteError
  if (!broken) return null
  const key = `${status.lastSyncAt || ''}|${status.lastWriteError?.message || ''}`
  if (dismissed === key) return null
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2" role="alert">
      <div className="mx-auto flex max-w-7xl items-center gap-2 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="flex-1">
          {lang === 'bn'
            ? 'সার্ভারের সাথে সংযোগ হচ্ছে না — সংরক্ষিত তথ্য দেখানো হচ্ছে। নতুন পরিবর্তন সার্ভারে জমা নাও হতে পারে।'
            : 'Could not reach the server — showing saved data. New changes may not have been saved.'}
        </p>
        <button
          type="button"
          onClick={() => { setDismissed(''); syncFromFirestore({ force: true }) }}
          className="flex min-h-[36px] items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 font-semibold hover:border-amber-500"
        >
          <RefreshCw className="h-4 w-4" />{lang === 'bn' ? 'আবার চেষ্টা' : 'Retry'}
        </button>
        <button type="button" aria-label="Dismiss" onClick={() => setDismissed(key)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-amber-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
