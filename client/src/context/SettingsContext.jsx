import axios from 'axios'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Public business + hamper settings, loaded once from GET /api/settings.
 * The admin can change the hamper's section count and names from the
 * dashboard — the builder derives everything from these values, so
 * nothing about sections is hardcoded in the UI.
 */
const DEFAULT_SECTION_NAMES = [
  'Something Sweet',
  'Melt-in-Mouth',
  'Classic Favourites',
  'Crunchy & Savoury',
  'Chocolate & More',
  'Finishing Touch'
]

const FALLBACK = {
  heroTitle: 'Hampers packed with love',
  heroSubtitle:
    'Pick your favourite sweets and savouries, and we\u2019ll pack them into a beautiful gift box \u2014 fresh from our shelves to their doorstep.',
  heroImage: '/images/hero.jpg',
  aboutTitle: 'Our shop',
  aboutText:
    'Shreeji & Shreeji is our family-run sweets and namkeen shop. We make fresh mithai every morning and pack custom gift hampers to order, delivered to your doorstep.',
  logoText: 'Shreeji & Shreeji',
  sitePhone: '+91 98290 12345',
  siteWhatsapp: '+919829012345',
  siteEmail: 'hello@shreejiandshreeji.com',
  siteAddress: '12, Station Road, Bikaner, Rajasthan 334001',
  siteHours: 'Mon–Sat · 10am–8pm',
  instagram: 'https://instagram.com/shreeji.shreeji',
  facebook: 'https://facebook.com/shreejishreeji',
  announcement: '',
  hamperSectionCount: 6,
  hamperSectionNames: DEFAULT_SECTION_NAMES,
  stepsHeading: 'Three little steps to the perfect gift',
  step1Title: 'Pick your favourites',
  step1Text: 'Choose one treat from each section and craft a hamper that feels truly personal.',
  step2Title: 'We handpack it fresh',
  step2Text: 'Your hamper is packed the morning it ships \u2014 nestled in, sealed and gift-ready.',
  step3Title: 'Delivered to their door',
  step3Text: 'Carried with care to the people you love, anywhere we deliver.',
  footerNote:
    'Handcrafted gift hampers of India\u2019s finest sweets and savouries \u2014 packed fresh to order and delivered with care.'
}

const SettingsContext = createContext({ settings: FALLBACK, refresh: async () => {}, getSections: () => [], getSectionNames: () => [] })

/** Parse section count safely (1..20). */
function parseCount(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n)) return FALLBACK.hamperSectionCount
  return Math.min(20, Math.max(1, Math.round(n)))
}

/** Parse section names into a clean array. */
function parseNames(raw) {
  if (Array.isArray(raw)) return raw.map((s) => String(s || '').trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr.map((s) => String(s || '').trim()).filter(Boolean)
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK)

  const refresh = async () => {
    try {
      const base = `${import.meta.env.VITE_API_URL || ''}/api`
      const res = await axios.get(`${base}/settings`, { timeout: 15000 })
      const s = res.data?.settings || res.data || {}
      setSettings({ ...FALLBACK, ...s })
    } catch {
      /* keep fallback */
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const getSections = () => {
    const count = parseCount(settings.hamperSectionCount)
    const names = parseNames(settings.hamperSectionNames)
    return Array.from({ length: count }, (_, i) => ({
      n: i + 1,
      name: names[i] || DEFAULT_SECTION_NAMES[i] || `Section ${i + 1}`
    }))
  }

  /** Raw admin-editable section names (independent of the section count). */
  const getSectionNames = () => {
    const names = parseNames(settings.hamperSectionNames)
    return Array.from(
      { length: Math.max(names.length, DEFAULT_SECTION_NAMES.length, 20) },
      (_, i) => names[i] || DEFAULT_SECTION_NAMES[i] || `Section ${i + 1}`
    )
  }

  const value = useMemo(() => ({ settings, refresh, getSections, getSectionNames }), [settings])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}
