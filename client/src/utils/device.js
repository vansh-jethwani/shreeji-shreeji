// Reliable-ish device detection for choosing the UPI experience:
// mobile/tablet -> UPI intent (upi://pay), desktop/laptop -> QR code.
// Uses user-agent hints plus touch capability; when uncertain we
// expose both options and let the user pick.

function ua() {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent || ''
}

export function isTouchDevice() {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints > 0 && navigator.maxTouchPoints !== undefined)
  )
}

export function isMobile() {
  const re = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i
  return re.test(ua())
}

export function isTablet() {
  const re = /iPad|Tablet|PlayBook|Silk/i
  if (re.test(ua())) return true
  // iPadOS 13+ reports as Macintosh with touch support
  return /Macintosh/i.test(ua()) && isTouchDevice() && Math.min(window.screen.width, window.screen.height) < 1100
}

/** Mobile phones and tablets get the UPI-app intent experience. */
export function isMobileOrTablet() {
  return isMobile() || isTablet()
}

export function isDesktop() {
  return !isMobileOrTablet()
}

/** Human label used in the UI, e.g. "mobile", "tablet", "desktop". */
export function deviceLabel() {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}
