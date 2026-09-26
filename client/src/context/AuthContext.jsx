import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const TOKEN_KEY = 'ss_token'

const publicClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  timeout: 25000
})

/**
 * Normalize a phone number to E.164-ish form for India.
 * - strip non-digits
 * - 10 digits starting 6-9 → +91 + digits
 * - 12 digits starting 91 → + digits
 * - anything else → sent as-is, backend validates
 */
export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `+91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  return String(raw || '').trim()
}

const AuthContext = createContext({
  user: null,
  authLoading: true,
  isAdmin: false,
  signInOpen: false,
  returnTo: '/',
  openSignIn: () => {},
  closeSignIn: () => {},
  login: async () => ({ isNewUser: false }),
  logout: () => {},
  getToken: () => null
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [signInOpen, setSignInOpen] = useState(false)
  const [returnTo, setReturnTo] = useState('/')

  // On mount: if a token exists, rehydrate the session from the backend.
  useEffect(() => {
    let cancelled = false
    async function rehydrate() {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setAuthLoading(false)
        return
      }
      try {
        const res = await publicClient.get('/user/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000
        })
        if (cancelled) return
        setUser(res.data?.user || null)
        setIsAdmin(Boolean(res.data?.isAdmin))
      } catch {
        if (cancelled) return
        localStorage.removeItem(TOKEN_KEY)
        setUser(null)
        setIsAdmin(false)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    }
    rehydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const openSignIn = useCallback((to) => {
    setReturnTo(to || '/')
    setSignInOpen(true)
  }, [])

  const closeSignIn = useCallback(() => {
    setSignInOpen(false)
  }, [])

  const login = useCallback(async (phone, name) => {
    const body = { phone: normalizePhone(phone) }
    if (name) body.name = name
    const res = await publicClient.post('/auth/login', body)
    const token = res.data?.token
    if (!token) throw new Error(res.data?.message || 'Sign in failed. Please try again.')
    localStorage.setItem(TOKEN_KEY, token)
    setUser(res.data?.user || null)
    setIsAdmin(Boolean(res.data?.isAdmin))
    return { isNewUser: Boolean(res.data?.isNewUser) }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setIsAdmin(false)
  }, [])

  const getToken = useCallback(() => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      authLoading,
      isAdmin,
      signInOpen,
      returnTo,
      openSignIn,
      closeSignIn,
      login,
      logout,
      getToken
    }),
    [user, authLoading, isAdmin, signInOpen, returnTo, openSignIn, closeSignIn, login, logout, getToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  return useContext(AuthContext)
}
