import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography
} from '@mui/material'
import { useApi } from '../lib/api.js'
import { useAuthContext } from '../context/AuthContext.jsx'
import {
  loadGoogleMaps,
  createPredictionFetcher,
  getPlaceAddress
} from '../lib/googleMaps.js'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const EMPTY_ADDRESS = {
  building: '',
  street: '',
  colony: '',
  area: '',
  city: '',
  state: '',
  pincode: ''
}

function validateAddress(f) {
  if (!f.city.trim()) return 'City is required.'
  if (!f.state.trim()) return 'State is required.'
  if (!/^\d{6}$/.test(f.pincode.trim())) return 'Pincode must be exactly 6 digits.'
  return ''
}

function addressLines(a) {
  if (!a) return ''
  return [a.building, a.street, a.colony, a.area, a.city, a.state, a.pincode]
    .filter(Boolean)
    .join(', ')
}

/** Same address form as checkout: Maps autocomplete on top, manual entry always allowed. */
function AddressForm({ api, onSaved, onCancel }) {
  const [maps, setMaps] = useState(null)
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState([])
  const [form, setForm] = useState(EMPTY_ADDRESS)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fetcherRef = useRef(null)

  useEffect(() => {
    if (!MAPS_KEY) return undefined
    let alive = true
    loadGoogleMaps(MAPS_KEY)
      .then((m) => {
        if (alive) {
          setMaps(m)
          fetcherRef.current = createPredictionFetcher(m)
        }
      })
      .catch(() => {
        /* manual entry remains available */
      })
    return () => {
      alive = false
    }
  }, [])

  const handleQuery = (value) => {
    setQuery(value)
    if (fetcherRef.current) fetcherRef.current.fetch(value).then(setPredictions)
  }

  const pickPrediction = async (prediction) => {
    if (!maps) return
    try {
      const addr = await getPlaceAddress(maps, prediction.place_id)
      setForm((prev) => ({
        ...prev,
        street: addr.street || prev.street,
        colony: addr.colony || prev.colony,
        area: addr.area || prev.area,
        city: addr.city || prev.city,
        state: addr.state || prev.state,
        pincode: addr.pincode || prev.pincode,
        latitude: addr.latitude ?? null,
        longitude: addr.longitude ?? null,
        formattedAddress: addr.formattedAddress || ''
      }))
      setPredictions([])
      setQuery('')
    } catch {
      setError('Could not load that address. Please fill the fields manually.')
    }
  }

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const save = async () => {
    const err = validateAddress(form)
    if (err) {
      setError(err)
      return
    }
    setError('')
    setSaving(true)
    const payload = {
      building: form.building.trim(),
      street: form.street.trim(),
      colony: form.colony?.trim?.() || '',
      area: form.area?.trim?.() || '',
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim()
    }
    if (form.latitude != null) payload.latitude = form.latitude
    if (form.longitude != null) payload.longitude = form.longitude
    if (form.formattedAddress) payload.formattedAddress = form.formattedAddress
    try {
      const res = await api.post('/user/addresses', payload)
      onSaved(res.data?.addresses || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save the address. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Add a new address
      </Typography>

      {MAPS_KEY && (
        <Box sx={{ position: 'relative', mb: 2 }}>
          <TextField
            fullWidth
            label="Search address"
            placeholder="Start typing your address…"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            helperText="Pick a suggestion to fill the form, or enter it manually below."
          />
          {predictions.length > 0 && (
            <Paper
              elevation={3}
              sx={{
                position: 'absolute',
                zIndex: 10,
                left: 0,
                right: 0,
                mt: 0.5,
                maxHeight: 240,
                overflow: 'auto'
              }}
            >
              <List dense disablePadding>
                {predictions.map((p) => (
                  <ListItemButton key={p.place_id} onClick={() => pickPrediction(p)}>
                    <ListItemText
                      primary={p.structured_formatting?.main_text}
                      secondary={p.description}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box
        sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
      >
        <TextField label="Flat / Building" value={form.building} onChange={set('building')} fullWidth />
        <TextField label="Street" value={form.street} onChange={set('street')} fullWidth />
        <TextField label="Colony" value={form.colony} onChange={set('colony')} fullWidth />
        <TextField label="Area" value={form.area} onChange={set('area')} fullWidth />
        <TextField label="City *" value={form.city} onChange={set('city')} fullWidth required />
        <TextField label="State *" value={form.state} onChange={set('state')} fullWidth required />
        <TextField
          label="Pincode *"
          value={form.pincode}
          onChange={set('pincode')}
          fullWidth
          required
          inputProps={{ maxLength: 6, inputMode: 'numeric' }}
          helperText="6 digits"
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? <CircularProgress size={22} color="inherit" /> : 'Save Address'}
        </Button>
        <Button variant="text" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </Box>
    </Paper>
  )
}

export default function Profile() {
  const api = useApi()
  const { logout } = useAuthContext()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  const [addresses, setAddresses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [addressMsg, setAddressMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([api.get('/user/profile'), api.get('/user/addresses')])
      .then(([profileRes, addrRes]) => {
        if (!alive) return
        const u = profileRes.data?.user || {}
        setName(u.name || '')
        setEmail(u.email || '')
        setPhone(u.phone || '')
        setAddresses(addrRes.data?.addresses || [])
        setLoadError('')
      })
      .catch(() => {
        if (alive) setLoadError('Could not load your profile. Please try again.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [api])

  const saveProfile = async () => {
    setSavingProfile(true)
    setProfileMsg({ type: '', text: '' })
    try {
      await api.patch('/user/profile', { name: name.trim(), email: email.trim() })
      setProfileMsg({ type: 'success', text: 'Your profile has been updated.' })
    } catch (e) {
      setProfileMsg({
        type: 'error',
        text: e.response?.data?.error || 'Could not save your profile. Please try again.'
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const deleteAddress = async (addressId) => {
    if (!window.confirm('Delete this address?')) return
    setDeletingId(addressId)
    setAddressMsg({ type: '', text: '' })
    try {
      const res = await api.delete(`/user/addresses/${addressId}`)
      setAddresses(res.data?.addresses || [])
      setAddressMsg({ type: 'success', text: 'Address deleted.' })
    } catch (e) {
      setAddressMsg({
        type: 'error',
        text: e.response?.data?.error || 'Could not delete the address. Please try again.'
      })
    } finally {
      setDeletingId('')
    }
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} /> <Typography>Loading your profile…</Typography>
        </Box>
      </Container>
    )
  }

  if (loadError) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" action={<Button onClick={() => window.location.reload()}>Retry</Button>}>
          {loadError}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Profile
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account details
          </Typography>
          {profileMsg.text && (
            <Alert
              severity={profileMsg.type}
              sx={{ mb: 2 }}
              onClose={() => setProfileMsg({ type: '', text: '' })}
            >
              {profileMsg.text}
            </Alert>
          )}
          <Box
            sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
          >
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 80 }}
            />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              label="Mobile number"
              value={phone}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText="Your mobile number is your account identity and cannot be changed here."
            />
          </Box>
          <Button variant="contained" sx={{ mt: 2 }} onClick={saveProfile} disabled={savingProfile}>
            {savingProfile ? <CircularProgress size={22} color="inherit" /> : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Saved addresses
          </Typography>
          {addressMsg.text && (
            <Alert
              severity={addressMsg.type}
              sx={{ mb: 2 }}
              onClose={() => setAddressMsg({ type: '', text: '' })}
            >
              {addressMsg.text}
            </Alert>
          )}

          {addresses.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1.5, mb: 1 }}>
              {addresses.map((a) => (
                <Paper
                  key={a._id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    alignItems: 'flex-start'
                  }}
                >
                  <Box>
                    <Typography variant="body1">{addressLines(a)}</Typography>
                    {a.formattedAddress && (
                      <Typography variant="body2" color="text.secondary">
                        {a.formattedAddress}
                      </Typography>
                    )}
                  </Box>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={deletingId === String(a._id)}
                    onClick={() => deleteAddress(a._id)}
                  >
                    {deletingId === String(a._id) ? 'Deleting…' : 'Delete'}
                  </Button>
                </Paper>
              ))}
            </Box>
          )}
          {addresses.length === 0 && !showForm && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No saved addresses yet.
            </Typography>
          )}

          {!showForm ? (
            <Button variant="outlined" sx={{ mt: 1 }} onClick={() => setShowForm(true)}>
              Add new address
            </Button>
          ) : (
            <AddressForm
              api={api}
              onCancel={() => setShowForm(false)}
              onSaved={(list) => {
                setAddresses(list)
                setShowForm(false)
                setAddressMsg({ type: 'success', text: 'Address saved.' })
              }}
            />
          )}
        </CardContent>
      </Card>

      <Button variant="text" color="error" onClick={logout}>
        Sign out
      </Button>
    </Container>
  )
}
