import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Grid,
  Skeleton,
  Typography
} from '@mui/material'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { usePublicApi } from '../lib/api.js'
import { resolveImageUrl } from '../lib/images.js'
import { formatINR } from '../utils/upi.js'

export default function HamperTypes() {
  const navigate = useNavigate()
  const publicApi = usePublicApi()
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await publicApi.get('/hamper-types')
        const list = res.data?.hamperTypes || res.data || []
        const arr = (Array.isArray(list) ? list : [])
          .filter((t) => t.active !== false)
          .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0))
        if (!cancelled) setTypes(arr)
      } catch {
        if (!cancelled) setError('Could not load the hamper collection. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [publicApi])

  const go = (t) => {
    const id = t._id || t.id
    navigate(t.customizable ? `/create-hamper/${id}` : `/hampers/${id}`)
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
        <Typography
          variant="overline"
          sx={{ color: '#B98A2F', fontWeight: 700, letterSpacing: '0.22em', display: 'block', mb: 1 }}
        >
          Handcrafted Gift Hampers
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }} gutterBottom>
          Choose your hamper
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
          Pick a size and make it yours — or choose a ready-to-gift Bikaji hamper,
          packed and good to go.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" sx={{ aspectRatio: '4/3', borderRadius: 5 }} />
              <Skeleton sx={{ mt: 1.5 }} />
              <Skeleton width="45%" />
            </Grid>
          ))}
        </Grid>
      ) : types.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" gutterBottom sx={{ fontFamily: '"Fraunces",Georgia,serif' }}>
            No hampers yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We&apos;re putting the collection together — please check back soon.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {types.map((t) => {
            const customizable = t.customizable !== false
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={t._id || t.id}>
                <Card
                  sx={{
                    height: '100%',
                    border: '1px solid #EFE3D0',
                    boxShadow: '0 4px 16px rgba(62,42,32,0.06)',
                    transition: 'all 0.25s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(62,42,32,0.14)' }
                  }}
                >
                  <CardActionArea onClick={() => go(t)} sx={{ height: '100%', borderRadius: 5 }}>
                    <Box sx={{ position: 'relative' }}>
                      <CardMedia
                        component="img"
                        image={resolveImageUrl(t.image) || '/images/hero.jpg'}
                        alt={t.name}
                        sx={{ aspectRatio: '4/3', objectFit: 'cover', borderRadius: '20px 20px 0 0' }}
                      />
                      <Chip
                        label={customizable ? 'Customizable' : 'Ready to gift'}
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 12,
                          left: 12,
                          fontWeight: 700,
                          background: customizable ? '#3E2A20' : '#D9A441',
                          color: customizable ? '#FBF7EF' : '#3E2A20'
                        }}
                      />
                    </Box>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 700 }}>
                        {t.name}
                      </Typography>
                      {t.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {t.description}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: '#C96F4A' }}>
                          {formatINR(t.price)}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          sx={{ color: '#A8562F', display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          {customizable ? 'Customize' : 'View hamper'}
                          <ArrowForwardIcon fontSize="small" />
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}
    </Container>
  )
}
