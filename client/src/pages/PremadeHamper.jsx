import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CardMedia,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Skeleton,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { usePublicApi } from '../lib/api.js'
import { resolveImageUrl } from '../lib/images.js'
import { useCart } from '../context/CartContext.jsx'
import { formatINR } from '../utils/upi.js'

const MAX_QTY = 10

export default function PremadeHamper() {
  const { id } = useParams()
  const navigate = useNavigate()
  const publicApi = usePublicApi()
  const { addHamper } = useCart()

  const [type, setType] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setNotFound(false)
      try {
        const res = await publicApi.get(`/hamper-types/${id}`)
        const t = res.data?.hamperType || res.data
        if (!cancelled) {
          if (!t || !t._id || t.active === false) {
            setNotFound(true)
          } else {
            setType(t)
          }
        }
      } catch (e) {
        if (!cancelled) {
          if (e.response?.status === 404) setNotFound(true)
          else setNotFound(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [publicApi, id])

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton variant="rounded" sx={{ aspectRatio: '4/3', borderRadius: 5 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton width="60%" height={44} />
            <Skeleton width="30%" height={36} sx={{ mt: 1 }} />
            <Skeleton width="100%" sx={{ mt: 2 }} />
            <Skeleton width="90%" />
          </Grid>
        </Grid>
      </Container>
    )
  }

  if (notFound || !type) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 700 }}>
          This hamper isn&apos;t available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          It may have been removed or is no longer on sale. Have a look at the rest of the collection.
        </Typography>
        <Button variant="contained" component={Link} to="/hampers">
          Browse hampers
        </Button>
      </Container>
    )
  }

  const price = Number(type.price) || 0
  const fixedItems = Array.isArray(type.fixedItems) ? type.fixedItems : []
  const total = price * qty

  const handleBuy = () => {
    addHamper({
      hamperTypeId: type._id || type.id,
      hamperTypeName: type.name,
      customizable: false,
      qty,
      items: fixedItems.map((f) => ({
        name: f.name,
        weight: f.weight,
        qty: Number(f.qty) || 1
      })),
      total
    })
    navigate('/checkout')
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Grid container spacing={{ xs: 3, md: 5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <CardMedia
            component="img"
            image={resolveImageUrl(type.image) || '/images/hero.jpg'}
            alt={type.name}
            sx={{ borderRadius: 5, aspectRatio: '4/3', objectFit: 'cover', border: '1px solid #EFE3D0' }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Chip
            label="Ready to gift"
            size="small"
            sx={{ mb: 1.5, fontWeight: 700, background: '#D9A441', color: '#3E2A20' }}
          />
          <Typography variant="h3" sx={{ fontSize: { xs: '1.9rem', md: '2.4rem' } }} gutterBottom>
            {type.name}
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#C96F4A', mb: 2 }}>
            {formatINR(price)}
          </Typography>
          {type.description && (
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              {type.description}
            </Typography>
          )}

          <Box sx={{ mb: 3, border: '1px solid #EFE3D0', borderRadius: 0, backgroundColor: '#FFFDF8', p: { xs: 2.5, sm: 3 } }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: '"Fraunces",Georgia,serif', mb: 1.5 }}>
              What&apos;s inside
            </Typography>
            {fixedItems.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                A curated selection of our shop favourites, packed fresh on the day it ships.
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {fixedItems.map((f, i) => (
                  <Typography component="li" variant="body2" key={i} sx={{ mb: 0.75, lineHeight: 1.6 }}>
                    {f.name}
                    {f.weight ? ` — ${f.weight}` : ''}
                    {Number(f.qty) > 1 ? ` × ${f.qty}` : ''}
                  </Typography>
                ))}
              </Box>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Packed as-is — this hamper isn&apos;t customizable.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', border: '1.5px solid #EFE3D0', borderRadius: 3 }}>
              <IconButton
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                size="small"
              >
                <RemoveIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 36, textAlign: 'center' }}>
                {qty}
              </Typography>
              <IconButton
                aria-label="Increase quantity"
                onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                disabled={qty >= MAX_QTY}
                size="small"
              >
                <AddIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Total: <strong style={{ color: '#C96F4A', fontSize: '1.15rem' }}>{formatINR(total)}</strong>
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<ShoppingBagOutlinedIcon />}
            onClick={handleBuy}
            sx={{ py: 1.6, fontSize: '1.05rem' }}
          >
            Buy Now — {formatINR(total)}
          </Button>
          <Divider sx={{ my: 2.5 }} />
          <Button variant="text" component={Link} to="/hampers" sx={{ color: '#A8562F' }}>
            ← Back to all hampers
          </Button>
        </Grid>
      </Grid>
    </Container>
  )
}
