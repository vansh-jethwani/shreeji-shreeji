// Client-side UPI + currency helpers. The backend is the source of truth
// for amounts — these helpers only format/display and build intents
// from server-returned values. Never compute a payable amount here.

/** Format a number as Indian rupees, e.g. 1249 -> ₹1,249 */
export function formatINR(amount) {
  const n = Number(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n)
}

/** Format with paise for UPI URI, e.g. 1249 -> "1249.00" */
export function formatUpiAmount(amount) {
  return (Number(amount) || 0).toFixed(2)
}

/**
 * Build a UPI deep link from trusted server values.
 * All params are URL-encoded. Amount comes from the backend only.
 */
export function buildUpiIntent({ merchantUpiId, merchantName, amount, transactionRef, note }) {
  const params = new URLSearchParams({
    pa: merchantUpiId,
    pn: merchantName || 'Shreeji & Shreeji',
    am: formatUpiAmount(amount),
    cu: 'INR',
    tr: transactionRef || '',
    tn: note || 'Shreeji & Shreeji Diwali Hamper'
  })
  return `upi://pay?${params.toString()}`
}

/** Attempt to open the UPI intent; returns false if it likely failed. */
export function openUpiIntent(upiUri) {
  try {
    window.location.href = upiUri
    return true
  } catch {
    return false
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers / non-secure contexts
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}
