// Auth. Demo Mode: localStorage accounts (DEMO_USERS). Production: Firebase Auth.
// SECURITY NOTE: a role stored in the browser is NEVER trusted for admin rights.
// Real admin privileges come from Firebase Admin SDK custom claims set by the
// setAdminClaim Cloud Function (functions/index.js). Demo roles are demo-only.
import { createContext, useContext, useEffect, useState } from 'react'
import { isDemoMode } from '../lib/firebase'
import { DEMO_USERS } from '../data/demo'

const AuthContext = createContext()
const KEY = 'sp_auth_user'
const USERS_KEY = 'sp_users_extra'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (user) localStorage.setItem(KEY, JSON.stringify(user)); else localStorage.removeItem(KEY) }, [user])

  const login = async (email, password) => {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 400)) // simulate network
      const all = [...DEMO_USERS, ...JSON.parse(localStorage.getItem(USERS_KEY) || '[]')]
      const found = all.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
      if (!found) throw new Error('Invalid email or password.')
      const { password: _pw, ...safe } = found
      setUser(safe)
      return safe
    } finally { setLoading(false) }
  }
  const register = async ({ name, email, password }) => {
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 400))
      const all = [...DEMO_USERS, ...JSON.parse(localStorage.getItem(USERS_KEY) || '[]')]
      if (all.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists.')
      const safe = { id: 'u_' + Date.now(), name, email, role: 'customer' }
      localStorage.setItem(USERS_KEY, JSON.stringify([...JSON.parse(localStorage.getItem(USERS_KEY) || '[]'), { ...safe, password }]))
      setUser(safe)
      return safe
    } finally { setLoading(false) }
  }
  const registerSeller = async ({ name, email, password, storeName }) => {
    const safe = await register({ name, email, password })
    const seller = { id: 's_' + Date.now(), storeName, storeNameBn: storeName, owner: name, rating: 0, products: 0, followers: 0, verified: false, status: 'pending', banner: '', logo: '' }
    const extra = JSON.parse(localStorage.getItem('sp_sellers_extra') || '[]')
    localStorage.setItem('sp_sellers_extra', JSON.stringify([...extra, seller]))
    setUser({ ...safe, role: 'seller', sellerId: seller.id })
    return seller
  }
  const logout = () => setUser(null)
  const updateProfile = (patch) => setUser((u) => ({ ...u, ...patch }))

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerSeller, logout, updateProfile, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
