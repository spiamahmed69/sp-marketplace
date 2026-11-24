import { createContext, useContext, useEffect, useState } from 'react'

const WishlistContext = createContext()
const KEY = 'sp_wishlist'
export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } })
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(ids)) }, [ids])
  const toggle = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const has = (id) => ids.includes(id)
  const clear = () => setIds([])
  return <WishlistContext.Provider value={{ ids, toggle, has, clear }}>{children}</WishlistContext.Provider>
}
export const useWishlist = () => useContext(WishlistContext)
