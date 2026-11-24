// Auth.
// Demo Mode: localStorage accounts (DEMO_USERS).
// Production (Firebase configured): Firebase Auth — signInWithEmailAndPassword,
// createUserWithEmailAndPassword, onAuthStateChanged, signOut. The user
// profile/role comes from the Firestore `users/{uid}` document
// (name, email, role: customer | seller | admin | moderator, sellerId).
// SECURITY NOTE: a role stored in the browser is NEVER trusted for admin
// rights on the server side. Real enforcement lives in firestore.rules
// (custom claims OR the users-doc role — see DEPLOYMENT.md §5 — until the
// setAdminClaim Cloud Function is deployed) and in Cloud Functions.
// Demo roles are demo-only.
import { createContext, useContext, useEffect, useState } from 'react'
import { auth, db, isDemoMode } from '../lib/firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile as updateFbProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { DEMO_USERS } from '../data/demo'
import { saveSeller, syncFromFirestore } from '../lib/firestore'

const AuthContext = createContext()
const KEY = 'sp_auth_user'
const USERS_KEY = 'sp_users_extra'

const friendlyAuthError = (e) => {
  const code = e?.code || ''
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') return 'Invalid email or password.'
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists.'
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.'
  if (code === 'auth/invalid-email') return 'Enter a valid email address.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.'
  return e?.message || 'Something went wrong. Please try again.'
}

// Load the profile for a signed-in Firebase user. Creates the users doc with
// the safe default role when it does not exist yet (e.g. an Auth-only account
// or a register whose profile write failed). A linked seller store promotes
// the display role to seller; admin/moderator roles in the doc take precedence.
async function loadUserProfile(fbUser) {
  const ref = doc(db, 'users', fbUser.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    const profile = {
      id: fbUser.uid,
      name: fbUser.displayName || fbUser.email.split('@')[0],
      email: fbUser.email,
      role: 'customer',
      createdAt: new Date().toISOString(),
    }
    try { await setDoc(ref, profile) } catch (e) { console.warn('[auth] could not create users doc:', e?.message || e) }
    return profile
  }
  const data = { id: fbUser.uid, ...snap.data() }
  if (data.role === 'customer' && data.sellerId) {
    try {
      const sSnap = await getDoc(doc(db, 'sellers', data.sellerId))
      if (sSnap.exists()) return { ...data, role: 'seller' }
    } catch { /* keep the customer role */ }
  }
  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isDemoMode) return null
    try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(!isDemoMode)
  useEffect(() => {
    if (!isDemoMode) return
    if (user) localStorage.setItem(KEY, JSON.stringify(user)); else localStorage.removeItem(KEY)
  }, [user])

  // Production: keep the session in sync with Firebase Auth, and reload the
  // Firestore cache whenever the signed-in user changes (role-gated reads
  // such as orders and users depend on who is signed in).
  useEffect(() => {
    if (isDemoMode) return undefined
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) { setUser(null); return }
        setUser(await loadUserProfile(fbUser))
      } catch (e) {
        console.warn('[auth] profile load failed:', e?.message || e)
        setUser(null)
      } finally {
        setLoading(false)
        syncFromFirestore()
      }
    })
    return unsub
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      if (!isDemoMode) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
        const profile = await loadUserProfile(cred.user)
        setUser(profile)
        return profile
      }
      await new Promise((r) => setTimeout(r, 400)) // simulate network
      const all = [...DEMO_USERS, ...JSON.parse(localStorage.getItem(USERS_KEY) || '[]')]
      const found = all.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
      if (!found) throw new Error('Invalid email or password.')
      const { password: _pw, ...safe } = found
      setUser(safe)
      return safe
    } catch (e) {
      if (!isDemoMode) throw new Error(friendlyAuthError(e))
      throw e
    } finally { setLoading(false) }
  }
  const register = async ({ name, email, password }) => {
    setLoading(true)
    try {
      if (!isDemoMode) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        try { await updateFbProfile(cred.user, { displayName: name }) } catch { /* display name is cosmetic */ }
        const safe = { id: cred.user.uid, name, email: email.trim(), role: 'customer' }
        try {
          await setDoc(doc(db, 'users', cred.user.uid), { ...safe, createdAt: new Date().toISOString() })
        } catch (e) { console.warn('[auth] could not create users doc:', e?.message || e) }
        setUser(safe)
        return safe
      }
      await new Promise((r) => setTimeout(r, 400))
      const all = [...DEMO_USERS, ...JSON.parse(localStorage.getItem(USERS_KEY) || '[]')]
      if (all.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists.')
      const safe = { id: 'u_' + Date.now(), name, email, role: 'customer' }
      localStorage.setItem(USERS_KEY, JSON.stringify([...JSON.parse(localStorage.getItem(USERS_KEY) || '[]'), { ...safe, password }]))
      setUser(safe)
      return safe
    } catch (e) {
      if (!isDemoMode) throw new Error(friendlyAuthError(e))
      throw e
    } finally { setLoading(false) }
  }
  const registerSeller = async ({ name, email, password, storeName }) => {
    if (!isDemoMode) {
      const safe = await register({ name, email, password })
      const seller = {
        id: 's_' + Date.now(), storeName, storeNameBn: storeName, owner: name, ownerId: safe.id,
        rating: 0, products: 0, followers: 0, verified: false, status: 'pending',
        banner: '', logo: '', createdAt: new Date().toISOString(),
      }
      saveSeller(seller) // writes Firestore + cache
      try { await updateDoc(doc(db, 'users', safe.id), { sellerId: seller.id }) } catch (e) { console.warn('[auth] could not link sellerId:', e?.message || e) }
      const withSeller = { ...safe, role: 'seller', sellerId: seller.id }
      setUser(withSeller)
      return seller
    }
    const safe = await register({ name, email, password })
    const seller = { id: 's_' + Date.now(), storeName, storeNameBn: storeName, owner: name, rating: 0, products: 0, followers: 0, verified: false, status: 'pending', banner: '', logo: '' }
    const extra = JSON.parse(localStorage.getItem('sp_sellers_extra') || '[]')
    localStorage.setItem('sp_sellers_extra', JSON.stringify([...extra, seller]))
    setUser({ ...safe, role: 'seller', sellerId: seller.id })
    return seller
  }
  const logout = async () => {
    if (!isDemoMode) { try { await signOut(auth) } catch { /* already signed out */ } }
    setUser(null)
  }
  const updateProfile = async (patch) => {
    // Never let the client change its own role / identity fields.
    const safePatch = { ...patch }
    delete safePatch.role
    delete safePatch.sellerId
    delete safePatch.id
    delete safePatch.email
    setUser((u) => (u ? { ...u, ...safePatch } : u))
    if (!isDemoMode && user?.id) {
      try { await updateDoc(doc(db, 'users', user.id), safePatch) } catch (e) { console.warn('[auth] profile update failed:', e?.message || e) }
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, registerSeller, logout, updateProfile, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
