import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography
} from '@mui/material'
import { useApi } from '../lib/api.js'
import { resolveImageUrl } from '../lib/images.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { formatINR } from '../utils/upi.js'

const PAYMENT_CHIP = {
  Pending: 'warning',
  'Pending Verification': 'info',
  Paid: 'success',
  Failed: 'error',
  Refunded: 'default'
}

const ORDER_CHIP = {
  'Order Placed': 'default',
  'Payment Verification Pending': 'info',
  Confirmed: 'primary',
  Preparing: 'warning',
  'Out for Delivery': 'warning',
  Delivered: 'success',
  Cancelled: 'error'
}

const ORDER_STATUSES = [
  'Order Placed',
  'Payment Verification Pending',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled'
]

const PAYMENT_STATUSES = ['Pending', 'Pending Verification', 'Paid', 'Failed', 'Refunded']

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function addressLines(a) {
  if (!a) return ''
  return [a.building, a.street, a.colony, a.area, a.city, a.state, a.pincode]
    .filter(Boolean)
    .join(', ')
}

/* ---------------- Products ---------------- */

const EMPTY_PRODUCT = {
  name: '',
  section: 1,
  price: '',
  weight: '',
  image: '',
  description: '',
  available: true
}

function ProductTab() {
  const api = useApi()
  const { getSections } = useSettings()
  const sections = getSections()
  const sectionName = (n) => sections.find((s) => s.n === Number(n))?.name || `Section ${n}`
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null) // product object or null for "add"
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/products')
      setProducts(res.data?.products || [])
      setError('')
    } catch {
      setError('Could not load products.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_PRODUCT)
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name || '',
      section: p.section || 1,
      price: p.price ?? '',
      weight: p.weight || '',
      image: p.image || '',
      description: p.description || '',
      available: p.available !== false
    })
    setFormError('')
    setDialogOpen(true)
  }

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    const price = Number(form.price)
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Price must be a valid number.')
      return
    }
    const section = Number(form.section)
    if (!(section >= 1 && section <= sections.length)) {
      setFormError(`Section must be between 1 and ${sections.length}.`)
      return
    }
    setSaving(true)
    setFormError('')
    const payload = {
      name: form.name.trim(),
      section,
      price,
      weight: form.weight.trim(),
      image: form.image.trim(),
      description: form.description.trim(),
      available: Boolean(form.available)
    }
    try {
      if (editing) {
        await api.patch(`/admin/products/${editing._id}`, payload)
      } else {
        await api.post('/admin/products', payload)
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      setFormError(e.response?.data?.error || 'Could not save the product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/products/${deleteTarget._id}`)
      setDeleteTarget(null)
      load()
    } catch (e) {
      setDeleteTarget(null)
      setError(e.response?.data?.error || 'Could not delete the product.')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Products</Typography>
        <Button variant="contained" onClick={openAdd}>
          Add Product
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
          <CircularProgress size={24} /> <Typography>Loading products…</Typography>
        </Box>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Section</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Available</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{sectionName(p.section)}</TableCell>
                  <TableCell align="right">{formatINR(p.price)}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.available ? 'Yes' : 'No'}
                      color={p.available ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(p)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No products yet. Add your first one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Product' : 'Add Product'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1, mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Name *" value={form.name} onChange={set('name')} fullWidth />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <FormControl fullWidth>
              <InputLabel>Section</InputLabel>
              <Select value={form.section} label="Section" onChange={set('section')}>
                {sections.map((s) => (
                  <MenuItem key={s.n} value={s.n}>
                    {s.n}. {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Price (₹) *"
              type="number"
              value={form.price}
              onChange={set('price')}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Box>
          <TextField label="Weight (e.g. 500g)" value={form.weight} onChange={set('weight')} fullWidth />
          <TextField label="Image URL" value={form.image} onChange={set('image')} fullWidth />
          <TextField
            label="Description"
            value={form.description}
            onChange={set('description')}
            fullWidth
            multiline
            rows={3}
          />
          <FormControlLabel
            control={<Switch checked={form.available} onChange={set('available')} />}
            label="Available for sale"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={22} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete product?</DialogTitle>
        <DialogContent>
          <Typography>
            “{deleteTarget?.name}” will be removed from the catalogue. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ---------------- Hamper Types ---------------- */

const EMPTY_HAMPER_TYPE = {
  name: '',
  price: '',
  image: '',
  description: '',
  customizable: true,
  sectionCount: 6,
  sections: [], // [{ name, productIds }] — per-section overrides for customizable types
  fixedItems: [],
  active: true,
  sortOrder: 0
}

const EMPTY_FIXED_ITEM = { name: '', weight: '', qty: 1 }

function HamperTypesTab() {
  const api = useApi()
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null) // hamper type object or null for "add"
  const [form, setForm] = useState(EMPTY_HAMPER_TYPE)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { getSectionNames } = useSettings()
  const globalSectionNames = getSectionNames()

  // Image upload state
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileInputRef = useRef(null)

  // Product catalogue for the per-section options picker
  const [allProducts, setAllProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const productsLoaded = useRef(false)

  const ensureProducts = useCallback(async () => {
    if (productsLoaded.current) return
    productsLoaded.current = true
    setProductsLoading(true)
    try {
      const res = await api.get('/admin/products')
      const list = res.data?.products || res.data || []
      setAllProducts(Array.isArray(list) ? list : [])
    } catch {
      productsLoaded.current = false // allow retry next time the dialog opens
    } finally {
      setProductsLoading(false)
    }
  }, [api])

  // Products grouped by their global section, for the picker lists.
  const productsBySection = useMemo(() => {
    const map = new Map()
    for (const p of allProducts) {
      const n = Number(p.section) || 0
      if (!map.has(n)) map.set(n, [])
      map.get(n).push(p)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([n, items]) => ({
        n,
        name: globalSectionNames[n - 1] || `Section ${n}`,
        items: items.slice().sort((a, b) => String(a.name).localeCompare(String(b.name)))
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/hamper-types')
      const list = res.data?.hamperTypes || res.data || []
      const arr = (Array.isArray(list) ? list : []).slice()
      arr.sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
      setTypes(arr)
      setError('')
    } catch {
      setError('Could not load hamper types.')
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...EMPTY_HAMPER_TYPE, fixedItems: [], sections: [] })
    setFormError('')
    setUploadError('')
    setDialogOpen(true)
    ensureProducts()
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      name: t.name || '',
      price: t.price ?? '',
      image: t.image || '',
      description: t.description || '',
      customizable: t.customizable !== false,
      sectionCount: t.sectionCount ?? 6,
      sections: (t.sections || []).map((s) => ({
        name: s.name || '',
        productIds: (s.productIds || []).map(String)
      })),
      fixedItems: (t.fixedItems || []).map((f) => ({
        name: f.name || '',
        weight: f.weight || '',
        qty: Number(f.qty) || 1
      })),
      active: t.active !== false,
      sortOrder: t.sortOrder ?? 0
    })
    setFormError('')
    setUploadError('')
    setDialogOpen(true)
    ensureProducts()
  }

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const setFixedItem = (i, key) => (e) => {
    const value = e.target.value
    setForm((prev) => ({
      ...prev,
      fixedItems: prev.fixedItems.map((f, idx) => (idx === i ? { ...f, [key]: value } : f))
    }))
  }

  const addFixedItem = () =>
    setForm((prev) => ({ ...prev, fixedItems: [...prev.fixedItems, { ...EMPTY_FIXED_ITEM }] }))

  const removeFixedItem = (i) =>
    setForm((prev) => ({ ...prev, fixedItems: prev.fixedItems.filter((_, idx) => idx !== i) }))

  // Upload a hamper photo straight to the backend; the form stores the
  // returned /uploads/... path.
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post('/admin/upload', fd)
      const url = res.data?.url
      if (!url) throw new Error('empty url')
      setForm((prev) => ({ ...prev, image: url }))
    } catch {
      setUploadError('Could not upload the image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Per-section overrides for customizable types.
  const setSectionName = (i, name) =>
    setForm((prev) => {
      const arr = (prev.sections || []).slice()
      arr[i] = { name, productIds: arr[i]?.productIds || [] }
      return { ...prev, sections: arr }
    })

  const toggleSectionProduct = (i, productId) =>
    setForm((prev) => {
      const arr = (prev.sections || []).slice()
      const cur = arr[i] || { name: '', productIds: [] }
      const ids = cur.productIds.includes(productId)
        ? cur.productIds.filter((id) => id !== productId)
        : [...cur.productIds, productId]
      arr[i] = { ...cur, productIds: ids }
      return { ...prev, sections: arr }
    })

  const resetSections = () => setForm((prev) => ({ ...prev, sections: [] }))

  const editorSectionCount = Math.max(1, Math.min(20, Math.round(Number(form.sectionCount)) || 1))

  const save = async () => {
    if (!form.name.trim()) {
      setFormError('Name is required.')
      return
    }
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Price must be a valid number.')
      return
    }
    let sectionCount = null
    if (form.customizable) {
      sectionCount = Math.round(Number(form.sectionCount))
      if (!Number.isFinite(sectionCount) || sectionCount < 1 || sectionCount > 20) {
        setFormError('Sections must be between 1 and 20.')
        return
      }
    }
    const fixedItems = form.customizable
      ? []
      : form.fixedItems
          .filter((f) => f.name.trim())
          .map((f) => ({
            name: f.name.trim(),
            weight: f.weight.trim(),
            qty: Math.max(1, Math.round(Number(f.qty)) || 1)
          }))
    if (!form.customizable && fixedItems.length === 0) {
      setFormError('Add at least one item inside this hamper.')
      return
    }
    setSaving(true)
    setFormError('')
    // Per-section overrides: one entry per section (count = sectionCount).
    // An empty productIds list means "offer all products" for that section.
    const sections = form.customizable
      ? Array.from({ length: sectionCount }, (_, i) => ({
          name: (form.sections?.[i]?.name || '').trim(),
          productIds: (form.sections?.[i]?.productIds || []).map(String)
        }))
      : []
    const payload = {
      name: form.name.trim(),
      price,
      image: form.image.trim(),
      description: form.description.trim(),
      customizable: Boolean(form.customizable),
      sectionCount,
      sections,
      fixedItems,
      active: Boolean(form.active),
      sortOrder: Number(form.sortOrder) || 0
    }
    try {
      if (editing) {
        await api.patch(`/admin/hamper-types/${editing._id}`, payload)
      } else {
        await api.post('/admin/hamper-types', payload)
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      setFormError(e.response?.data?.error || 'Could not save the hamper type. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/admin/hamper-types/${deleteTarget._id}`)
      setDeleteTarget(null)
      load()
    } catch (e) {
      setDeleteTarget(null)
      setError(e.response?.data?.error || 'Could not delete the hamper type.')
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Hamper Types</Typography>
        <Button variant="contained" onClick={openAdd}>
          Add Hamper Type
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        These are the hamper cards customers choose from. Customizable types open the
        builder; ready-to-gift types go straight to their detail page.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
          <CircularProgress size={24} /> <Typography>Loading hamper types…</Typography>
        </Box>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Name</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Order</TableCell>
                <TableCell>Active</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {types.map((t) => (
                <TableRow key={t._id} hover>
                  <TableCell sx={{ width: 56 }}>
                    {t.image ? (
                      <Box
                        component="img"
                        src={resolveImageUrl(t.image)}
                        alt=""
                        sx={{ width: 44, height: 44, borderRadius: 2, objectFit: 'cover', display: 'block' }}
                      />
                    ) : null}
                  </TableCell>
                  <TableCell>{t.name}</TableCell>
                  <TableCell align="right">{formatINR(t.price)}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.customizable === false ? 'Ready to gift' : 'Customizable'}
                      color={t.customizable === false ? 'warning' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{t.sortOrder ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.active !== false ? 'Yes' : 'No'}
                      color={t.active !== false ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openEdit(t)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(t)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No hamper types yet. Add your first one.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? 'Edit Hamper Type' : 'Add Hamper Type'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1, mt: 1 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField label="Name *" value={form.name} onChange={set('name')} fullWidth />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
            <TextField
              label="Price (₹) *"
              type="number"
              value={form.price}
              onChange={set('price')}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={set('sortOrder')}
              fullWidth
              helperText="Lower shows first"
            />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Hamper photo
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {form.image ? (
                <Box
                  component="img"
                  src={resolveImageUrl(form.image)}
                  alt="Hamper preview"
                  sx={{
                    width: 96,
                    height: 96,
                    borderRadius: 3,
                    objectFit: 'cover',
                    border: '1px solid #EFE3D0',
                    background: '#FFFDF8'
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 96,
                    height: 96,
                    borderRadius: 3,
                    border: '2px dashed #E7D6BC',
                    background: '#FFFDF8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 1,
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    No photo yet
                  </Typography>
                </Box>
              )}
              <Box>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageSelect}
                />
                <Button
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <CircularProgress size={20} /> : 'Upload image'}
                </Button>
                {form.image && !uploading && (
                  <Button
                    size="small"
                    color="error"
                    sx={{ ml: 1 }}
                    onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
                  >
                    Remove
                  </Button>
                )}
                {uploadError && (
                  <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                    {uploadError}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
          <TextField
            label="Description"
            value={form.description}
            onChange={set('description')}
            fullWidth
            multiline
            rows={3}
          />
          <FormControlLabel
            control={<Switch checked={form.customizable} onChange={set('customizable')} />}
            label="Customizable (customer picks the items)"
          />
          {form.customizable ? (
            <>
              <TextField
                label="Number of sections"
                type="number"
                value={form.sectionCount}
                onChange={set('sectionCount')}
                fullWidth
                inputProps={{ min: 1, max: 20 }}
                helperText="How many picks the builder asks for (1–20)"
              />
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="subtitle2">Sections &amp; options</Typography>
                  <Button size="small" onClick={resetSections}>
                    Reset sections
                  </Button>
                </Box>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                  Choose which products each section offers. Leave a section&apos;s list empty
                  to offer every product there; leave the name empty to use the global
                  section name from Site Settings.
                </Typography>
                {productsLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" color="text.secondary">
                      Loading products…
                    </Typography>
                  </Box>
                ) : productsBySection.length === 0 ? (
                  <Alert severity="info">
                    No products yet — add them under the Products tab first.
                  </Alert>
                ) : (
                  Array.from({ length: editorSectionCount }).map((_, i) => {
                    const sec = form.sections?.[i] || { name: '', productIds: [] }
                    const selectedCount = sec.productIds.length
                    return (
                      <Box
                        key={i}
                        sx={{
                          border: '1px solid #EFE3D0',
                          borderRadius: 3,
                          background: '#FFFDF8',
                          p: 2,
                          mb: 2
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>
                            Section {i + 1}
                          </Typography>
                          <TextField
                            label="Section name (optional)"
                            placeholder={globalSectionNames[i] || `Section ${i + 1}`}
                            value={sec.name}
                            onChange={(e) => setSectionName(i, e.target.value)}
                            size="small"
                            sx={{ flexGrow: 1, minWidth: 200 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {selectedCount === 0
                            ? 'Offering all products in this section.'
                            : `${selectedCount} product${selectedCount === 1 ? '' : 's'} selected`}
                        </Typography>
                        <Box
                          sx={{
                            maxHeight: 240,
                            overflowY: 'auto',
                            border: '1px solid #F3E8D5',
                            borderRadius: 2,
                            p: 1,
                            background: '#fff'
                          }}
                        >
                          {productsBySection.map((g) => (
                            <Box key={g.n}>
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{ color: '#B98A2F', display: 'block', px: 1, pt: 1 }}
                              >
                                {g.name}
                              </Typography>
                              {g.items.map((p) => {
                                const pid = String(p._id || p.id)
                                const checked = sec.productIds.includes(pid)
                                return (
                                  <FormControlLabel
                                    key={pid}
                                    sx={{ display: 'flex', mx: 0, px: 1 }}
                                    control={
                                      <Checkbox
                                        size="small"
                                        checked={checked}
                                        onChange={() => toggleSectionProduct(i, pid)}
                                      />
                                    }
                                    label={
                                      <Box
                                        component="span"
                                        sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
                                      >
                                        <Typography variant="body2" component="span">
                                          {p.name}
                                        </Typography>
                                        {p.available === false && (
                                          <Chip label="unavailable" size="small" />
                                        )}
                                      </Box>
                                    }
                                  />
                                )
                              })}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )
                  })
                )}
              </Box>
            </>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                What&apos;s inside (fixed items)
              </Typography>
              {form.fixedItems.map((f, i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: '1fr 110px 76px auto',
                    alignItems: 'center',
                    mb: 1
                  }}
                >
                  <TextField
                    label="Item name"
                    value={f.name}
                    onChange={setFixedItem(i, 'name')}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Weight"
                    placeholder="500g"
                    value={f.weight}
                    onChange={setFixedItem(i, 'weight')}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Qty"
                    type="number"
                    value={f.qty}
                    onChange={setFixedItem(i, 'qty')}
                    size="small"
                    inputProps={{ min: 1 }}
                  />
                  <Button size="small" color="error" onClick={() => removeFixedItem(i)}>
                    Remove
                  </Button>
                </Box>
              ))}
              <Button variant="outlined" size="small" onClick={addFixedItem}>
                Add item
              </Button>
            </Box>
          )}
          <FormControlLabel
            control={<Switch checked={form.active} onChange={set('active')} />}
            label="Active (visible to customers)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? <CircularProgress size={22} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete hamper type?</DialogTitle>
        <DialogContent>
          <Typography>
            “{deleteTarget?.name}” will be removed from the collection. This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ---------------- Orders ---------------- */

function OrdersTab() {
  const api = useApi()
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)
  const [actionMsg, setActionMsg] = useState({ type: '', text: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search.trim()) params.search = search.trim()
      if (paymentFilter) params.paymentStatus = paymentFilter
      if (statusFilter) params.orderStatus = statusFilter
      const res = await api.get('/admin/orders', { params })
      setOrders(res.data?.orders || [])
      setTotal(res.data?.total || 0)
      setError('')
    } catch {
      setError('Could not load orders.')
    } finally {
      setLoading(false)
    }
  }, [api, search, paymentFilter, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const openOrder = async (orderId) => {
    setActionMsg({ type: '', text: '' })
    try {
      const res = await api.get(`/admin/orders/${orderId}`)
      const o = res.data?.order
      setSelected(o)
      setNewStatus(o?.orderStatus || '')
    } catch {
      setError('Could not load that order.')
    }
  }

  const refreshSelected = (order) => {
    setSelected(order)
    setNewStatus(order.orderStatus)
    setOrders((prev) => prev.map((o) => (String(o._id) === String(order._id) ? order : o)))
  }

  const updateStatus = async () => {
    if (!selected || !newStatus) return
    setUpdating(true)
    setActionMsg({ type: '', text: '' })
    try {
      const res = await api.patch(`/admin/orders/${selected._id}/status`, { orderStatus: newStatus })
      refreshSelected(res.data?.order)
      setActionMsg({ type: 'success', text: `Order status updated to “${newStatus}”.` })
    } catch (e) {
      setActionMsg({
        type: 'error',
        text: e.response?.data?.error || 'Could not update the order status.'
      })
    } finally {
      setUpdating(false)
    }
  }

  const verifyPayment = async (paymentStatus) => {
    if (!selected) return
    setUpdating(true)
    setActionMsg({ type: '', text: '' })
    try {
      const res = await api.patch(`/admin/orders/${selected._id}/verify-payment`, { paymentStatus })
      refreshSelected(res.data?.order)
      setActionMsg({ type: 'success', text: `Payment marked as “${paymentStatus}”.` })
    } catch (e) {
      setActionMsg({
        type: 'error',
        text: e.response?.data?.error || 'Could not update the payment status.'
      })
    } finally {
      setUpdating(false)
    }
  }

  const canVerify =
    selected &&
    (selected.paymentStatus === 'Pending Verification' || selected.paymentStatus === 'Pending')

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Orders {total > 0 && <Typography component="span" color="text.secondary">({total})</Typography>}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' },
          mb: 2
        }}
      >
        <TextField
          label="Search order number or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Payment status</InputLabel>
          <Select value={paymentFilter} label="Payment status" onChange={(e) => setPaymentFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {PAYMENT_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Order status</InputLabel>
          <Select value={statusFilter} label="Order status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            {ORDER_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
          <CircularProgress size={24} /> <Typography>Loading orders…</Typography>
        </Box>
      ) : (
        <TableContainer component={Card} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o._id} hover sx={{ cursor: 'pointer' }} onClick={() => openOrder(o._id)}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      #{o.orderNumber || o._id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.phone}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(o.createdAt)}</TableCell>
                  <TableCell align="right">{formatINR(o.totalAmount)}</TableCell>
                  <TableCell>
                    <Chip label={o.paymentStatus} color={PAYMENT_CHIP[o.paymentStatus] || 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={o.orderStatus} color={ORDER_CHIP[o.orderStatus] || 'default'} size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No orders match these filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          Order #{selected?.orderNumber || selected?._id}
          <Typography variant="body2" color="text.secondary">
            {selected && formatDate(selected.createdAt)}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {actionMsg.text && (
            <Alert severity={actionMsg.type} sx={{ mb: 2 }} onClose={() => setActionMsg({ type: '', text: '' })}>
              {actionMsg.text}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip label={selected?.paymentStatus} color={PAYMENT_CHIP[selected?.paymentStatus] || 'default'} />
            <Chip label={selected?.orderStatus} color={ORDER_CHIP[selected?.orderStatus] || 'default'} />
            <Chip label={`UPI · ${formatINR(selected?.totalAmount)}`} variant="outlined" />
          </Box>

          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Items
          </Typography>
          {(selected?.items || []).map((item, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2">
                {item.name} <Typography component="span" color="text.secondary">(Section {item.section})</Typography>
              </Typography>
              <Typography variant="body2">{formatINR(item.price)}</Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Delivery
          </Typography>
          <Typography variant="body2">{addressLines(selected?.deliveryAddress)}</Typography>
          <Typography variant="body2" color="text.secondary">
            Contact: {selected?.phone}
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Payment verification
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Verify the payment in your UPI app / bank statement first. Marking it paid confirms the
            order; only do this after you have actually received the money.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
            <Button variant="contained" color="success" disabled={!canVerify || updating} onClick={() => verifyPayment('Paid')}>
              Mark Paid
            </Button>
            <Button variant="outlined" color="error" disabled={!canVerify || updating} onClick={() => verifyPayment('Failed')}>
              Mark Failed
            </Button>
          </Box>

          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Order status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 240 }}>
              <InputLabel>Status</InputLabel>
              <Select value={newStatus} label="Status" onChange={(e) => setNewStatus(e.target.value)}>
                {ORDER_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={updateStatus} disabled={updating || newStatus === selected?.orderStatus}>
              {updating ? <CircularProgress size={22} color="inherit" /> : 'Update Status'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

/* ---------------- Site settings ---------------- */

const SETTING_FIELDS = [
  { key: 'logoText', label: 'Logo text' },
  { key: 'heroTitle', label: 'Hero title' },
  { key: 'heroSubtitle', label: 'Hero subtitle', multiline: true },
  { key: 'heroImage', label: 'Hero image URL' },
  { key: 'aboutTitle', label: 'About title' },
  { key: 'aboutText', label: 'About text', multiline: true },
  { key: 'announcement', label: 'Announcement bar', multiline: true },
  { key: 'sitePhone', label: 'Shop phone' },
  { key: 'siteWhatsapp', label: 'WhatsApp number' },
  { key: 'siteEmail', label: 'Email' },
  { key: 'siteAddress', label: 'Shop address', multiline: true },
  { key: 'siteHours', label: 'Opening hours' },
  { key: 'instagram', label: 'Instagram URL' },
  { key: 'facebook', label: 'Facebook URL' }
]

const DEFAULT_SECTION_NAMES = [
  'Sweets',
  'Namkeen',
  'Snacks',
  'Milk Sweets',
  'Premium Treats',
  'Gifts & Extras'
]

/* Editable homepage copy: steps heading/cards + footer tagline. */
const HOMEPAGE_FIELDS = [
  { key: 'stepsHeading', label: 'Steps heading' },
  { key: 'step1Title', label: 'Step 1 title' },
  { key: 'step1Text', label: 'Step 1 text', multiline: true },
  { key: 'step2Title', label: 'Step 2 title' },
  { key: 'step2Text', label: 'Step 2 text', multiline: true },
  { key: 'step3Title', label: 'Step 3 title' },
  { key: 'step3Text', label: 'Step 3 text', multiline: true },
  { key: 'footerNote', label: 'Footer tagline', multiline: true }
]

const ALL_TEXT_FIELDS = [...SETTING_FIELDS, ...HOMEPAGE_FIELDS]

function SettingsTab() {
  const api = useApi()
  const { settings, refresh } = useSettings()
  const [form, setForm] = useState({})
  const [hamperCount, setHamperCount] = useState(6)
  const [hamperNames, setHamperNames] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    const next = {}
    for (const f of ALL_TEXT_FIELDS) next[f.key] = settings?.[f.key] || ''
    setForm(next)

    const c = Math.min(20, Math.max(1, Number(settings?.hamperSectionCount) || 6))
    setHamperCount(c)
    const raw = Array.isArray(settings?.hamperSectionNames) ? settings.hamperSectionNames : []
    setHamperNames(
      Array.from({ length: c }, (_, i) => raw[i] || DEFAULT_SECTION_NAMES[i] || `Section ${i + 1}`)
    )
  }, [settings])

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const changeHamperCount = (e) => {
    const c = Math.min(20, Math.max(1, Number(e.target.value) || 1))
    setHamperCount(c)
    setHamperNames((prev) =>
      Array.from({ length: c }, (_, i) => prev[i] || DEFAULT_SECTION_NAMES[i] || `Section ${i + 1}`)
    )
  }

  const setHamperName = (i) => (e) =>
    setHamperNames((prev) => prev.map((n, idx) => (idx === i ? e.target.value : n)))

  const save = async () => {
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const payload = {}
      for (const f of ALL_TEXT_FIELDS) payload[f.key] = (form[f.key] || '').trim()
      payload.hamperSectionCount = hamperCount
      payload.hamperSectionNames = hamperNames.map((n) => (n || '').trim())
      await api.put('/admin/settings', { settings: payload })
      await refresh()
      setMsg({ type: 'success', text: 'Site settings saved.' })
    } catch (e) {
      setMsg({
        type: 'error',
        text: e.response?.data?.error || 'Could not save settings. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Site Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        These details appear across the site — the header, footer, home page, and contact page.
      </Typography>

      {msg.text && (
        <Alert severity={msg.type} sx={{ mb: 2 }} onClose={() => setMsg({ type: '', text: '' })}>
          {msg.text}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Hamper Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Control the hamper builder: how many sections it has and what each one is called.
            The builder page updates automatically — customers pick one option from each section.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            If you lower the number of sections, products sitting in the removed sections will be
            hidden from the builder — reassign them to a kept section (or deactivate them) first.
          </Alert>
          <TextField
            label="Number of sections"
            type="number"
            value={hamperCount}
            onChange={changeHamperCount}
            inputProps={{ min: 1, max: 20 }}
            sx={{ maxWidth: 220, mb: 2 }}
            helperText="1–20 sections"
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {hamperNames.map((name, i) => (
              <TextField
                key={i}
                label={`Section ${i + 1} name`}
                value={name}
                onChange={setHamperName(i)}
                fullWidth
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Homepage content
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Every text on the home page — the &ldquo;how it works&rdquo; heading, the three
            step cards, and the footer tagline.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {HOMEPAGE_FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                value={form[f.key] || ''}
                onChange={set(f.key)}
                fullWidth
                multiline={Boolean(f.multiline)}
                rows={f.multiline ? 3 : 1}
                sx={f.multiline ? { gridColumn: { sm: '1 / -1' } } : undefined}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Branding &amp; contact
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {SETTING_FIELDS.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              value={form[f.key] || ''}
              onChange={set(f.key)}
              fullWidth
              multiline={Boolean(f.multiline)}
              rows={f.multiline ? 3 : 1}
              sx={f.multiline ? { gridColumn: { sm: '1 / -1' } } : undefined}
            />
          ))}
          </Box>
        </CardContent>
      </Card>

      <Button variant="contained" size="large" sx={{ mt: 2 }} onClick={save} disabled={saving}>
        {saving ? <CircularProgress size={22} color="inherit" /> : 'Save Settings'}
      </Button>
    </Box>
  )
}

/* ---------------- Dashboard ---------------- */

export default function AdminDashboard() {
  const [tab, setTab] = useState(0)

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Dashboard
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Products" />
        <Tab label="Hamper Types" />
        <Tab label="Orders" />
        <Tab label="Site Settings" />
      </Tabs>

      {tab === 0 && <ProductTab />}
      {tab === 1 && <HamperTypesTab />}
      {tab === 2 && <OrdersTab />}
      {tab === 3 && <SettingsTab />}
    </Container>
  )
}
