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
import { useApi } from '../lib/api.js'
import { useCart } from '../context/CartContext.jsx'
import { buildUpiIntent, copyText, formatINR } from '../utils/upi.js'
import QRCode from 'react-qr-code'
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
  const [payment, setPayment] = useState(null) // { orderId, orderNumber, total, merchantName }

  // Manual-UPI pay flow: the customer pays in their own UPI app, then submits
  // the 12-digit UTR. Nothing here marks anything paid — the backend only
  // records the reference; the admin verifies manually.
  const [payState, setPayState] = useState('idle') // idle | submitting
  const [payError, setPayError] = useState('')
  const [upiCfg, setUpiCfg] = useState(null)
  const [upiLoading, setUpiLoading] = useState(false)
  const [upiError, setUpiError] = useState('')
  const [utr, setUtr] = useState('')
  const [utrError, setUtrError] = useState('')
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
      // The backend is the sole source of truth for the total — it prices
      // from the hamper type, so no amount is sent. Payment is manual UPI:
      // the next step shows the merchant UPI ID + exact-amount QR.
      const res = await api.post('/orders', {
        hamperTypeId: orderPayload.hamperTypeId,
        selections: orderPayload.selections,
        qty: orderPayload.qty,
        addressId: String(selectedAddress._id)
      })
      const d = res.data || {}
      setPayment({
        orderId: d.orderId || d.order?._id,
        orderNumber: d.orderNumber || d.order?.orderNumber,
        total: d.total ?? total,
        merchantName: d.merchantName || 'Shreeji & Shreeji'
      })
    } catch (e) {
      setPlaceError(e.response?.data?.error || 'Could not place your order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  /** Load the merchant UPI details once the payment step is shown. */
  useEffect(() => {
    if (!payment) return undefined
    let alive = true
    setUpiLoading(true)
    api
      .get('/payment/upi/config')
      .then((res) => {
        if (alive) {
          setUpiCfg(res.data || null)
          setUpiError('')
        }
      })
      .catch(() => {
        if (alive) setUpiError('Could not load payment details. Please refresh and try again.')
      })
      .finally(() => {
        if (alive) setUpiLoading(false)
      })
    return () => {
      alive = false
    }
  }, [api, payment])

  /** Exact-amount UPI intent built from server values only. */
  const upiUri = useMemo(() => {
    if (!upiCfg?.upiId || !payment) return ''
    return buildUpiIntent({
      merchantUpiId: upiCfg.upiId,
      merchantName: upiCfg.merchantName,
      amount: payment.total,
      transactionRef: payment.orderNumber,
      note: `Shreeji & Shreeji order ${payment.orderNumber}`
    })
  }, [upiCfg, payment])

  const copyUpiId = async () => {
    if (!upiCfg?.upiId) return
    const ok = await copyText(upiCfg.upiId)
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 2000)
  }

  /** Submit the 12-digit UTR after paying manually. Never marks anything
   * paid — the backend only records the reference for admin verification. */
  const submitUtr = async () => {
    const ref = utr.replace(/[\s-]+/g, '')
    if (!/^\d{12}$/.test(ref)) {
      setUtrError('Enter the 12-digit UTR / UPI reference number shown in your payment app.')
      return
    }
    if (!payment?.orderNumber || payState !== 'idle') return
    setUtrError('')
    setPayState('submitting')
    setPayError('')
    try {
      await api.post('/payment/upi/submit-reference', {
        orderNumber: payment.orderNumber,
        upiRef: ref
      })
      clearCart()
      navigate(`/order-success/${payment.orderId}`)
    } catch (e) {
      setPayState('idle')
      setPayError(
        e.response?.data?.error || 'Could not submit your payment reference. Please try again.'
      )
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
            Pay via UPI to our UPI ID — scan the QR or pay in your UPI app, then share the
            12-digit UTR reference. We verify every payment manually before confirming your order.
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
        <Box sx={{ maxWidth: 560, mx: 'auto' }}>
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
            Pay via UPI
          </Typography>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Order
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  #{payment.orderNumber}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Merchant
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {upiCfg?.merchantName || payment.merchantName}
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Amount payable
                </Typography>
                <Typography variant="h5" fontWeight={800}>
                  {formatINR(payment.total)}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Exact amount — it cannot be edited.
              </Typography>
            </CardContent>
          </Card>

          {upiLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 4 }}>
              <CircularProgress size={24} /> <Typography>Loading payment details…</Typography>
            </Box>
          ) : upiError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {upiError}
            </Alert>
          ) : (
            upiCfg && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>Step 1.</strong> Pay {formatINR(payment.total)} to our UPI ID — scan the QR
                  or use your UPI app (GPay, PhonePe, Paytm, BHIM).
                  <br />
                  <strong>Step 2.</strong> Enter the 12-digit UTR / UPI reference number from your
                  payment app below. We verify every payment manually and confirm your order.
                </Typography>

                <Paper
                  variant="outlined"
                  sx={{ p: 3, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}
                >
                  <Box sx={{ bgcolor: '#fff', p: 1.5, borderRadius: 1 }}>
                    <QRCode value={upiUri} size={200} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Typography variant="body1" fontWeight={600} sx={{ letterSpacing: 0.5 }}>
                      {upiCfg.upiId}
                    </Typography>
                    <Button size="small" variant="outlined" onClick={copyUpiId}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </Box>
                  <Button
                    component="a"
                    href={upiUri}
                    variant="text"
                    size="small"
                    sx={{ textTransform: 'none' }}
                  >
                    Open in UPI app
                  </Button>
                </Paper>

                <TextField
                  fullWidth
                  label="UTR / UPI reference number (12 digits)"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
                  error={Boolean(utrError)}
                  helperText={utrError || 'Found in your payment app under transaction details.'}
                  inputProps={{ inputMode: 'numeric', maxLength: 12 }}
                  sx={{ mb: 2 }}
                />

                {payError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {payError}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={submitUtr}
                  disabled={payState !== 'idle' || utr.replace(/[^\d]/g, '').length !== 12}
                  sx={{ py: 1.5, fontSize: '1.02rem' }}
                >
                  {payState === 'submitting' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                      Submitting…
                    </Box>
                  ) : (
                    "I've Paid — Submit for Verification"
                  )}
                </Button>

                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1.5, textAlign: 'center' }}
                >
                  Submitting the reference does not charge anything — it only tells us to verify
                  your payment. Your order is confirmed after we receive the money.
                </Typography>
              </Box>
            )
          )}
        </Box>
      )}
    </Container>
  )
}
