import { useMemo } from 'react'
import axios from 'axios'

// Base URL for the backend. VITE_API_URL is the origin (no /api suffix);
// leave it empty in local dev to use the Vite dev-server proxy.
const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`

const plain = axios.create({ baseURL: API_BASE, timeout: 25000 })

/**
 * Public API client — no auth header (e.g. product catalogue,
 * business settings).
 */
export function usePublicApi() {
  return useMemo(() => plain, [])
}

/**
 * Authenticated API client. Attaches the JWT stored under `ss_token` as
 * `Authorization: Bearer <token>` to every request. The token is read
 * synchronously from localStorage inside the request interceptor, so it
 * is always the latest value — no hook-state subscription needed.
 */
export function useApi() {
  return useMemo(() => {
    const authed = axios.create({ baseURL: API_BASE, timeout: 25000 })
    authed.interceptors.request.use(
      (config) => {
        try {
          const token = localStorage.getItem('ss_token')
          if (token) config.headers.Authorization = `Bearer ${token}`
        } catch {
          /* proceed without a token — the backend answers 401 */
        }
        return config
      },
      (error) => Promise.reject(error)
    )
    return authed
  }, [])
}

/** Raw client for one-off public calls outside hooks. */
export const api = plain
