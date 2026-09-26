import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from './AuthContext.jsx'

const GUEST_KEY = 'shreeji_cart_v1_guest'
const LEGACY_KEY = 'shreeji_cart_v1' // key used before per-account carts

// One stored cart per account, so two numbers on the same browser
// never see each other's hampers.
const keyFor = (user) => {
  const id = user?.id || user?._id || user?.phone
  return id ? `shreeji_cart_v1_u_${id}` : GUEST_KEY
}

const CartContext = createContext(null)

function loadFrom(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTo(key, hampers) {
  try {
    localStorage.setItem(key, JSON.stringify(hampers))
  } catch {
    // storage full / private mode — cart simply won't persist
  }
}

/**
 * Cart holds ONE customized hamper at a time (the backend creates one
 * order per checkout). Adding a new hamper replaces the old one.
 * Hamper: { id, hamperTypeId, hamperTypeName, customizable, qty,
 *           items: [{ productId, name, price, image, section, weight }], total }
 */
export function CartProvider({ children }) {
  const { user } = useAuthContext()
  const uid = user?.id || user?._id || user?.phone || null

  const [hampers, setHampers] = useState(() => {
    const guest = loadFrom(GUEST_KEY)
    if (guest.length > 0) return guest.slice(0, 1)
    // One-time migration of carts saved before this fix.
    const legacy = loadFrom(LEGACY_KEY)
    if (legacy.length > 0) {
      saveTo(GUEST_KEY, legacy)
      try { localStorage.removeItem(LEGACY_KEY) } catch {}
      return legacy.slice(0, 1)
    }
    return []
  })
  // Which account's cart is currently loaded (null = guest).
  const [cartUid, setCartUid] = useState(null)

  // Switch the loaded cart whenever the signed-in account changes.
  useEffect(() => {
    if (uid === cartUid) return
    let next = loadFrom(keyFor(user))
    if (uid && next.length === 0) {
      // Signing in with an empty account cart: adopt the guest cart
      // (e.g. a hamper built before signing in) instead of losing it.
      const guest = loadFrom(GUEST_KEY)
      if (guest.length > 0) {
        next = guest
        saveTo(keyFor(user), guest)
        try { localStorage.removeItem(GUEST_KEY) } catch {}
      }
    }
    setCartUid(uid)
    setHampers(next.slice(0, 1))
  }, [uid, cartUid, user])

  // Persist to the current account's key — never mid-switch.
  useEffect(() => {
    if (cartUid !== uid) return
    saveTo(keyFor(user), hampers)
  }, [hampers, uid, cartUid, user])

  const value = useMemo(
    () => ({
      hampers,
      count: hampers.length,
      total: hampers.reduce((sum, h) => sum + (h.total || 0), 0),
      addHamper(hamper) {
        const id = hamper.id || `hamper-${Date.now()}`
        // One hamper per order — a new hamper replaces the previous one.
        setHampers([{ ...hamper, id }])
        return id
      },
      updateHamper(id, hamper) {
        setHampers((prev) => prev.map((h) => (h.id === id ? { ...hamper, id } : h)))
      },
      removeHamper(id) {
        setHampers((prev) => prev.filter((h) => h.id !== id))
      },
      clearCart() {
        setHampers([])
      }
    }),
    [hampers]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
