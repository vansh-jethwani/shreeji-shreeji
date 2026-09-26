import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import Box from '@mui/material/Box'
import { useAuthContext } from '../context/AuthContext.jsx'
import { useApi } from '../lib/api.js'

function backendMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback
}

export default function SignInModal() {
  const { signInOpen, closeSignIn, returnTo, login } = useAuthContext()
  const api = useApi()
  const navigate = useNavigate()

  const [step, setStep] = useState('phone') // 'phone' | 'details'
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [name, setName] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Reset the form every time the modal opens.
  useEffect(() => {
    if (signInOpen) {
      setStep('phone')
      setPhone('')
      setPhoneError('')
      setName('')
      setFieldErrors({})
      setError('')
      setBusy(false)
    }
  }, [signInOpen])

  const validPhone = /^\d{10}$/.test(phone.trim())

  const handlePhoneContinue = async () => {
    if (!validPhone) {
      setPhoneError('Please enter a valid 10-digit mobile number.')
      return
    }
    setPhoneError('')
    setError('')
    setBusy(true)
    try {
      const { isNewUser } = await login(phone)
      // Fresh user record so we can check `user.name` exactly as the
      // contract requires: details step when isNewUser || !user.name.
      let userName = ''
      try {
        const me = await api.get('/user/me')
        userName = me.data?.user?.name || ''
      } catch {
        /* backend unreachable here — isNewUser alone decides */
      }
      if (isNewUser || !userName) {
        setStep('details')
      } else {
        closeSignIn()
        navigate(returnTo || '/', { replace: true })
      }
    } catch (err) {
      setError(backendMessage(err, 'Could not sign in. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const handleDetailsSubmit = async () => {
    if (!name.trim()) {
      setFieldErrors({ name: 'Please tell us your name.' })
      return
    }
    setFieldErrors({})
    setError('')
    setBusy(true)
    try {
      await api.patch('/user/profile', { name: name.trim() })
    } catch (err) {
      setError(backendMessage(err, 'Could not save your name. Please try again.'))
      setBusy(false)
      return
    }
    setBusy(false)
    closeSignIn()
    navigate(returnTo || '/', { replace: true })
  }

  return (
    <Dialog open={signInOpen} onClose={closeSignIn} fullWidth maxWidth="xs">
      <DialogTitle>Sign in</DialogTitle>
      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {step === 'phone' ? (
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Mobile number"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              error={Boolean(phoneError)}
              helperText={phoneError || 'We use your mobile number to keep your orders safe.'}
              inputProps={{ inputMode: 'numeric' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">+91</InputAdornment>
              }}
              autoFocus
            />
          </Box>
        ) : (
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">Welcome! Tell us your name.</Alert>
            <TextField
              fullWidth
              label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
              autoFocus
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'phone' ? (
          <Button
            variant="contained"
            fullWidth
            onClick={handlePhoneContinue}
            disabled={busy || !validPhone}
          >
            {busy ? 'Signing in…' : 'Continue'}
          </Button>
        ) : (
          <Button
            variant="contained"
            fullWidth
            onClick={handleDetailsSubmit}
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Save and continue'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
