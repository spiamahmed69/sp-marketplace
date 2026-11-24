import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext()
const KEY = 'sp_cart'
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] } })
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)) }, [items])

  const add = (product, variant, qty = 1) => {
    if (product.stock <= 0) return false
    setItems((prev) => {
      const key = product.id + '|' + (variant || '')
      const found = prev.find((i) => i.key === key)
      if (found) {
        const nextQty = Math.min(product.stock, found.qty + qty)
        return prev.map((i) => (i.key === key ? { ...i, qty: nextQty } : i))
      }
      return [...prev, { key, productId: product.id, variant: variant || '', qty: Math.min(product.stock, qty) }]
    })
    return true
  }
  const setQty = (key, qty) => setItems((prev) => qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i)))
  const remove = (key) => setItems((prev) => prev.filter((i) => i.key !== key))
  const clear = () => setItems([])
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items])
  return <CartContext.Provider value={{ items, add, setQty, remove, clear, count }}>{children}</CartContext.Provider>
}
export const useCart = () => useContext(CartContext)
