import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { ShieldAlert } from 'lucide-react'

// Protected route: requires login, and optionally a role.
// NOTE: this is UI routing only. Real enforcement lives in Firestore Security
// Rules + Cloud Functions (custom claims) — see firestore.rules / functions/.
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="h-12 w-12 mx-auto text-primary" />
        <h1 className="mt-4 text-2xl font-bold">{user.role === 'seller' ? t('onlySeller') : t('onlyAdmin')}</h1>
        <p className="mt-2 text-muted">Logged in as {user.name} ({user.role}).</p>
      </div>
    )
  }
  return children
}
