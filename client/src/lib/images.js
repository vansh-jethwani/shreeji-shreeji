/**
 * Resolve an image URL stored on a hamper type (or anywhere else) to a
 * browser-loadable URL.
 *
 * Uploaded files are stored as paths like `/uploads/hamper-types/abc.jpg`
 * on the backend origin, so in production they must be prefixed with the
 * API origin (VITE_API_URL). In local dev VITE_API_URL is empty and the
 * Vite dev-server proxy serves `/uploads` from the backend.
 * Anything else (static /images/..., absolute URLs) is returned as-is.
 */
export function resolveImageUrl(url) {
  if (!url) return url
  if (typeof url === 'string' && url.startsWith('/uploads/')) {
    return `${import.meta.env.VITE_API_URL || ''}${url}`
  }
  return url
}
