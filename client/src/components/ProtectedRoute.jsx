import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuthContext } from '../context/AuthContext.jsx'

/**
 * Route guard. Unsigned visitors get the sign-in modal automatically —
 * once per page. If they close it, they stay on the placeholder below;
 * the "Sign in" button reopens it on demand.
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, authLoading, isAdmin, openSignIn, signInOpen } = useAuthContext()
  const location = useLocation()
  const dest = `${location.pathname}${location.search}`
  const autoOpenedFor = useRef('')

  useEffect(() => {
    if (!authLoading && !user && !signInOpen && autoOpenedFor.current !== dest) {
      autoOpenedFor.current = dest
      openSignIn(dest)
    }
  }, [authLoading, user, signInOpen, openSignIn, dest])

  if (authLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography color="text.secondary">One moment…</Typography>
        </Box>
      </Container>
    )
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Please sign in to continue
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We keep your hampers, orders and details under your mobile number.
          It only takes a minute.
        </Typography>
        <Button variant="contained" onClick={() => openSignIn(dest)}>
          Sign in
        </Button>
      </Container>
    )
  }

  if (requireAdmin && !isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          This corner is for the shop team
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The number you signed in with doesn&rsquo;t have admin access. If
          you run Shreeji &amp; Shreeji, sign in with the shop&rsquo;s
          authorised mobile number.
        </Typography>
      </Container>
    )
  }

  return children
}
