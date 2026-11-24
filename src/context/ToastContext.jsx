import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { uid } from '../lib/format'

const ToastContext = createContext()
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((message, type = 'success') => {
    const id = uid('toast')
    setToasts((ts) => [...ts, { id, message, type }])
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3500)
  }, [])
  const dismiss = (id) => setToasts((ts) => ts.filter((x) => x.id !== id))
  return (
    <ToastContext.Provider value={{ push, success: (m) => push(m, 'success'), error: (m) => push(m, 'error'), info: (m) => push(m, 'info') }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)]" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="fade-up flex items-center gap-2 rounded-lg bg-ink text-white px-4 py-3 shadow-lg text-sm min-h-[44px]">
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" /> : toast.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-400 shrink-0" /> : <Info className="h-5 w-5 text-sky-400 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="ml-1 p-1 rounded hover:bg-white/20 min-h-[32px] min-w-[32px]"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
export const useToast = () => useContext(ToastContext)
