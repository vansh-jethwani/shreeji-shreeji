import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Radio,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography
} from '@mui/material'
import QRCode from 'react-qr-code'
import { useApi } from '../lib/api.js'
import { useCart } from '../context/CartContext.jsx'
import { formatINR, openUpiIntent, copyText } from '../utils/upi.js'
import { isMobileOrTablet } from '../utils/device.js'
import {
  loadGoogleMaps,
  createPredictionFetcher,
  getPlaceAddress
} from '../lib/googleMaps.js'

const STEPS = ['Delivery address', 'Payment']
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const EMPTY_FORM = {
  building: '',
  street: '',
  colony: '',
  area: '',
  city: '',
  state: '',
  pincode: ''
}

function addressLines(a) {
  if (!a) return ''
  return [a.building, a.street, a.colony, a.area, a.city, a.state, a.pincode]
    .filter(Boolean)
    .join(', ')
}

/** Build the new order payload from the cart hamper.
 * Customizable: { sectionNumber: productId } picks. Premade: fixed hamper,
 * no selections. Never includes a client-calculated total — the backend
 * prices the order from the hamper type. */
function hamperOrderPayload(hamper) {
  const selections = {}
  if (hamper.customizable !== false) {
    for (const item of hamper.items || []) {
      if (item.section != null && item.productId) {
        selections[String(item.section)] = String(item.productId)
      }
    }
  }
  return {
    hamperTypeId: hamper.hamperTypeId,
    selections,
    qty: Number(hamper.qty) || 1
  }
}

function validateForm(f) {
  if (!f.city.trim()) return 'City is required.'
  if (!f.state.trim()) return 'State is required.'
  if (!/^\d{6}$/.test(f.pincode.trim())) return 'Pincode must be exactly 6 digits.'
  return ''
}

/** Address form with Google Maps autocomplete on top; manual entry always allowed. */
function AddressForm({ onSaved, onCancel, saving, api }) {
  const [maps, setMaps] = useState(null)
  const [mapsError, setMapsError] = useState('')
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
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
        if (alive)
          setMapsError('Address search is unavailable right now. Please enter the address manually.')
      })
    return () => {
      alive = false
    }
  }, [])

  const handleQuery = (value) => {
    setQuery(value)
    if (fetcherRef.current) {
      fetcherRef.current.fetch(value).then(setPredictions)
    }
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
      setFormError('')
    } catch {
      setFormError('Could not load that address. Please fill the fields manually.')
    }
  }

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const save = async () => {
    const err = validateForm(form)
    if (err) {
      setFormError(err)
      return
    }
    setFormError('')
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
      setFormError(e.response?.data?.error || 'Could not save the address. Please try again.')
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Add a new address
      </Typography>

      {MAPS_KEY ? (
        <Box sx={{ position: 'relative', mb: 2 }}>
          <TextField
            fullWidth
            label="Search address"
            placeholder="Start typing your address…"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            helperText={mapsError || 'Pick a suggestion to fill the form, or enter it manually below.'}
          />
          {predictions.length > 0 && (
            <Paper
              elevation={3}
              sx={{ position: 'absolute', zIndex: 10, left: 0, right: 0, mt: 0.5, maxHeight: 240, overflow: 'auto' }}
            >
              <List dense disablePadding>
                {predictions.map((p) => (
                  <ListItemButton key={p.place_id} onClick={() => pickPrediction(p)}>
                    <ListItemText primary={p.structured_formatting?.main_text} secondary={p.description} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          Address search is not configured. Please enter your address manually.
        </Alert>
      )}

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError('')}>
          {formError}
        </Alert>
      )}

      <Box
        component="div"
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

export default function Checkout() {
  const api = useApi()
  const navigate = useNavigate()
  const { hampers, total, clearCart } = useCart()

  const [activeStep, setActiveStep] = useState(0)
  const [addresses, setAddresses] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [placing, setPlacing] = useState(false)
  const [placeError, setPlaceError] = useState('')
  const [payment, setPayment] = useState(null) // { orderId, orderNumber, total, upiUri, merchantUpiId, merchantName, transactionReference }

  const [notifying, setNotifying] = useState(false)
  const [notifyError, setNotifyError] = useState('')
  const [copied, setCopied] = useState(false)

  const hamper = hampers[0] || null
  const orderPayload = useMemo(() => (hamper ? hamperOrderPayload(hamper) : null), [hampers])
  const selectedAddress = useMemo(
    () => addresses.find((a) => String(a._id) === String(selectedId)) || null,
    [addresses, selectedId]
  )

  useEffect(() => {
    let alive = true
    setLoadingAddresses(true)
    api
      .get('/user/addresses')
      .then((res) => {
        if (!alive) return
        const list = res.data?.addresses || []
        setAddresses(list)
        if (list.length > 0) setSelectedId(String(list[0]._id))
        setLoadError('')
      })
      .catch(() => {
        if (alive) setLoadError('Could not load your saved addresses. Please try again.')
      })
      .finally(() => {
        if (alive) setLoadingAddresses(false)
      })
    return () => {
      alive = false
    }
  }, [api])

  const handleSaved = (list) => {
    setSaving(true)
    setAddresses(list)
    const newest = list[list.length - 1]
    if (newest) setSelectedId(String(newest._id))
    setShowForm(false)
    setSaving(false)
  }

  const placeOrder = async () => {
    if (!selectedAddress) {
      setPlaceError('Please select a delivery address first.')
      return
    }
    if (!hamper || !orderPayload?.hamperTypeId) {
      setPlaceError('Your cart is missing its hamper. Please choose a hamper again.')
      return
    }
    if (hamper.customizable !== false && Object.keys(orderPayload.selections).length === 0) {
      setPlaceError(
        'Your hamper looks incomplete. Please rebuild it and try again.'
      )
      return
    }
    setPlacing(true)
    setPlaceError('')
    try {
      // New order contract: the backend is the sole source of truth for the
      // total — it prices from the hamper type, so no amount is sent.
      const res = await api.post('/orders', {
        hamperTypeId: orderPayload.hamperTypeId,
        selections: orderPayload.selections,
        qty: orderPayload.qty,
        addressId: String(selectedAddress._id)
      })
      const d = res.data || {}
      const upi = d.upi || {}
      setPayment({
        orderId: d.orderId || d.order?._id,
        orderNumber: d.orderNumber || d.order?.orderNumber,
        total: d.total ?? upi.amount,
        upiUri: d.upiUri || upi.uri,
        merchantUpiId: d.merchantUpiId || upi.merchantUpiId,
        merchantName: d.merchantName || upi.merchantName || 'Shreeji & Shreeji',
        transactionReference: d.transactionReference || upi.transactionReference
      })
    } catch (e) {
      setPlaceError(e.response?.data?.error || 'Could not place your order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  const confirmPaid = async () => {
    if (!payment?.orderNumber) return
    setNotifying(true)
    setNotifyError('')
    try {
      await api.post('/payment/upi/confirm-paid-notification', { orderNumber: payment.orderNumber })
      clearCart()
      navigate(`/order-success/${payment.orderId}`)
    } catch (e) {
      setNotifyError(
        e.response?.data?.error ||
          'We could not record your confirmation. If you paid, please contact us — do not pay again.'
      )
    } finally {
      setNotifying(false)
    }
  }

  const handleCopyUpiId = async () => {
    if (!payment?.merchantUpiId) return
    const ok = await copyText(payment.merchantUpiId)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (hampers.length === 0 && !payment) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Your cart is empty
        </Typography>
        <Typography color="text.secondary" paragraph>
          Build a hamper first — checkout starts with a full cart.
        </Typography>
        <Button variant="contained" component={Link} to="/hampers">
          Choose a Hamper
        </Button>
      </Container>
    )
  }

  const mobile = isMobileOrTablet()

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Checkout
      </Typography>
      <Stepper activeStep={activeStep} sx={{ my: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {activeStep === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Delivery address
          </Typography>

          {loadingAddresses ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
              <CircularProgress size={24} /> <Typography>Loading your addresses…</Typography>
            </Box>
          ) : loadError ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={<Button onClick={() => window.location.reload()}>Retry</Button>}
            >
              {loadError}
            </Alert>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {addresses.map((a) => (
                <Card
                  key={a._id}
                  variant="outlined"
                  sx={{
                    borderColor: String(a._id) === String(selectedId) ? 'primary.main' : undefined,
                    borderWidth: String(a._id) === String(selectedId) ? 2 : 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedId(String(a._id))}
                >
                  <CardContent
                    sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', py: 2 }}
                  >
                    <Radio checked={String(a._id) === String(selectedId)} value={String(a._id)} sx={{ mt: -1 }} />
                    <Box>
                      <Typography variant="body1">{addressLines(a)}</Typography>
                      {a.formattedAddress && (
                        <Typography variant="body2" color="text.secondary">
                          {a.formattedAddress}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {addresses.length === 0 && (
                <Alert severity="info">You have no saved addresses yet. Add one below to continue.</Alert>
              )}
            </Box>
          )}

          {!showForm ? (
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setShowForm(true)}>
              Add new address
            </Button>
          ) : (
            <AddressForm api={api} saving={saving} onCancel={() => setShowForm(false)} onSaved={handleSaved} />
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              disabled={!selectedAddress}
              onClick={() => setActiveStep(1)}
            >
              Continue to Payment
            </Button>
          </Box>
          {!selectedAddress && !loadingAddresses && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'right' }}>
              Select or add a delivery address to continue.
            </Typography>
          )}
        </Box>
      )}

      {activeStep === 1 && !payment && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Order summary
          </Typography>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              {hampers.map((h, idx) => (
                <Box key={h.id || idx} sx={{ mb: idx < hampers.length - 1 ? 2 : 0 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Hamper {idx + 1}
                  </Typography>
                  {(h.items || []).map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">
                        {item.name}
                        {item.weight ? ` · ${item.weight}` : ''}
                      </Typography>
                      <Typography variant="body2">{formatINR(item.price)}</Typography>
                    </Box>
                  ))}
                  {idx < hampers.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                </Box>
              ))}
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Total
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {formatINR(total)}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Delivering to: {addressLines(selectedAddress)}
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            We accept UPI payments only. Your payment is verified manually by our team — your order
            stays “Pending Verification” until we confirm it.
          </Alert>

          {placeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {placeError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setActiveStep(0)} disabled={placing}>
              Back
            </Button>
            <Button
              variant="contained"
              size="large"
              onClick={placeOrder}
              disabled={placing || !selectedAddress}
            >
              {placing ? <CircularProgress size={24} color="inherit" /> : `Place Order · ${formatINR(total)}`}
            </Button>
          </Box>
        </Box>
      )}

      {activeStep === 1 && payment && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Pay {formatINR(payment.total)} via UPI
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Order {payment.orderNumber ? `#${payment.orderNumber}` : ''} · please use this exact amount.
          </Typography>

          {mobile ? (
            <Button
              variant="contained"
              size="large"
              fullWidth
              sx={{ py: 2, fontSize: '1.1rem', mb: 2 }}
              onClick={() => openUpiIntent(payment.upiUri)}
            >
              Pay {formatINR(payment.total)} via UPI
            </Button>
          ) : (
            <Card variant="outlined" sx={{ maxWidth: 360, mx: 'auto', mb: 2 }}>
              <CardContent>
                {payment.upiUri ? (
                  <QRCode value={payment.upiUri} size={220} style={{ width: '100%', height: 'auto' }} />
                ) : (
                  <Alert severity="warning">Payment link unavailable. Please contact us.</Alert>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Scan with any UPI app (GPay, PhonePe, Paytm, BHIM)
                </Typography>
                {payment.merchantUpiId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {payment.merchantUpiId}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={handleCopyUpiId}>
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
            After paying, tap the button below. Payments are verified manually by our team — your
            order stays “Pending Verification” until we confirm it. Please do not pay twice.
          </Alert>

          {notifyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {notifyError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={confirmPaid}
            disabled={notifying}
            sx={{ py: 1.5 }}
          >
            {notifying ? <CircularProgress size={24} color="inherit" /> : 'I Have Completed Payment'}
          </Button>
        </Box>
      )}
    </Container>
  )
}
