import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Grid,
  LinearProgress,
  Skeleton,
  Typography
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { usePublicApi } from '../lib/api.js'
import { useCart } from '../context/CartContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useAuthContext } from '../context/AuthContext.jsx'
import { formatINR } from '../utils/upi.js'

export default function CreateHamper() {
  const { typeId } = useParams()
  const navigate = useNavigate()
  const publicApi = usePublicApi()
  const { addHamper, count } = useCart()
  const { getSections, getSectionNames } = useSettings()
  const { isAdmin } = useAuthContext()

  const [hamperType, setHamperType] = useState(null)
  const [typeLoading, setTypeLoading] = useState(true)
  const [typeUnavailable, setTypeUnavailable] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [picks, setPicks] = useState({}) // { sectionNumber: product }

  // Load the hamper type first — the builder is driven by it.
  useEffect(() => {
    let cancelled = false
    async function loadType() {
      setTypeLoading(true)
      setTypeUnavailable(false)
      try {
        const res = await publicApi.get(`/hamper-types/${typeId}`)
        const t = res.data?.hamperType || res.data
        if (!cancelled) {
          if (!t || !t._id || t.active === false || t.customizable === false) {
            setTypeUnavailable(true)
          } else {
            setHamperType(t)
          }
        }
      } catch {
        if (!cancelled) setTypeUnavailable(true)
      } finally {
        if (!cancelled) setTypeLoading(false)
      }
    }
    loadType()
    return () => {
      cancelled = true
    }
  }, [publicApi, typeId])

  // Sections come from the hamper type's own configuration when the backend
  // provides them (per-type section names + effective product options).
  // Otherwise fall back to the legacy global layout (settings count/names
  // with products grouped by their global section).
  const fallbackCount = getSections().length
  const rawTypeSections = hamperType?.sections
  const hasTypeSections =
    Array.isArray(rawTypeSections) && rawTypeSections.some((s) => s && typeof s === 'object')
  const sectionCount = hasTypeSections
    ? rawTypeSections.length
    : hamperType && Number(hamperType.sectionCount) > 0
      ? Math.min(20, Math.round(Number(hamperType.sectionCount)))
      : fallbackCount
  const sectionNames = getSectionNames()
  const sections = useMemo(() => {
    if (hasTypeSections) {
      return rawTypeSections.map((s, i) => ({
        n: i + 1,
        name:
          (s && typeof s.name === 'string' && s.name.trim()) ||
          sectionNames[i] ||
          `Section ${i + 1}`,
        // Effective options for this hamper's section — already filtered to
        // available by the backend. Null means "use the legacy product list".
        products: Array.isArray(s?.products) ? s.products : []
      }))
    }
    return Array.from({ length: sectionCount }, (_, i) => ({
      n: i + 1,
      name: sectionNames[i] || `Section ${i + 1}`,
      products: null
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTypeSections, rawTypeSections, sectionCount])
  const totalSteps = sections.length

  // Legacy path only: fetch the full product list and group by global section.
  // When the type carries its own sections, their products are used directly.
  useEffect(() => {
    if (typeLoading) return
    if (hasTypeSections) {
      setProducts([])
      setError('')
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      try {
        const res = await publicApi.get('/products')
        const list = res.data?.products || res.data || []
        const items = (Array.isArray(list) ? list : []).filter((p) => p.available !== false)
        if (!cancelled) setProducts(items)
      } catch (e) {
        if (!cancelled) setError('Could not load the hamper options. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [publicApi, typeLoading, hasTypeSections])

  const bySection = useMemo(() => {
    const map = {}
    for (const p of products) {
      const n = Number(p.section)
      if (!map[n]) map[n] = []
      map[n].push(p)
    }
    return map
  }, [products])

  const pickedCount = Object.keys(picks).length
  // The hamper price is fixed by the chosen hamper type — the treats inside
  // are included, so individual option prices are not shown or summed.
  const fixedTotal = hamperType ? Number(hamperType.price) || 0 : 0
  const complete = totalSteps > 0 && pickedCount === totalSteps

  const togglePick = (sectionNum, product) => {
    setPicks((prev) => {
      const key = String(sectionNum)
      const current = prev[key]
      const next = { ...prev }
      if (current && (current._id || current.id) === (product._id || product.id)) {
        delete next[key]
      } else {
        next[key] = product // exactly one pick per section — swaps
      }
      return next
    })
  }

  const handleAdd = () => {
    if (!complete || !hamperType) return
    // `section` is the 1-based index into the hamper type's sections — this is
    // the key the backend expects in the order payload's `selections` map.
    const items = sections.map(({ n }) => {
      const p = picks[String(n)]
      return {
        productId: p._id || p.id,
        name: p.name,
        price: Number(p.price) || 0,
        image: p.image,
        section: n,
        weight: p.weight
      }
    })
    addHamper({
      hamperTypeId: hamperType._id || hamperType.id,
      hamperTypeName: hamperType.name,
      customizable: true,
      qty: 1,
      items,
      total: fixedTotal
    })
    navigate('/cart')
  }

  if (typeLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Skeleton width="40%" height={44} sx={{ mx: 'auto' }} />
        <Skeleton width="60%" sx={{ mx: 'auto', mt: 1 }} />
        <Grid container spacing={2.5} sx={{ mt: 3 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
              <Skeleton variant="rounded" sx={{ aspectRatio: '1/1', borderRadius: 5 }} />
              <Skeleton sx={{ mt: 1 }} />
              <Skeleton width="60%" />
            </Grid>
          ))}
        </Grid>
      </Container>
    )
  }

  if (typeUnavailable) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom sx={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 700 }}>
          This hamper isn&apos;t available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          It may have been removed or is no longer on sale. Choose another hamper to customize.
        </Typography>
        <Button variant="contained" component={Link} to="/hampers">
          Browse hampers
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 }, pb: { xs: 26, md: 16 } }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography
          variant="overline"
          sx={{ color: '#B98A2F', fontWeight: 700, letterSpacing: '0.22em', display: 'block', mb: 1 }}
        >
          Custom Gift Hamper
        </Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: '2rem', md: '2.6rem' } }} gutterBottom>
          {hamperType?.name || 'Build your hamper'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
          Pick one delicacy from each section below. Tapping another option in the same
          section swaps your pick — everything inside is included in the hamper price.
        </Typography>
      </Box>

      {/* Progress */}
      <Card
        sx={{
          position: 'sticky',
          top: { xs: 64, md: 88 },
          zIndex: 5,
          mb: 3,
          px: { xs: 2.5, md: 3.5 },
          py: 2.25,
          background: 'rgba(255,253,248,0.94)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.25 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ fontFamily: '"Fraunces",Georgia,serif' }}>
            {pickedCount} of {totalSteps} selected
          </Typography>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Fixed hamper price
            </Typography>
            <Typography variant="h6" fontWeight={700} sx={{ color: '#C96F4A' }}>
              {formatINR(fixedTotal)}
            </Typography>
          </Box>
        </Box>
        <LinearProgress variant="determinate" value={totalSteps ? (pickedCount / totalSteps) * 100 : 0} sx={{ height: 10 }} />
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={i}>
              <Skeleton variant="rounded" sx={{ aspectRatio: '1/1', borderRadius: 5 }} />
              <Skeleton sx={{ mt: 1 }} />
              <Skeleton width="60%" />
            </Grid>
          ))}
        </Grid>
      ) : (
        sections.map((sec, idx) => {
          const { n, name } = sec
          // Per-type sections carry their own effective options; legacy
          // sections resolve options from the global product list.
          const options = sec.products ?? bySection[n] ?? []
          const selected = picks[String(n)]
          const selectedId = selected ? selected._id || selected.id : null
          return (
            <Box key={n} sx={{ mb: 5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '"Fraunces",Georgia,serif',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: selected ? '#fff' : '#C96F4A',
                    background: selected ? 'linear-gradient(135deg,#D6805A,#A8562F)' : '#fff',
                    border: selected ? 'none' : '1.5px solid #D9A441',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {idx + 1}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontSize: { xs: '1.3rem', md: '1.5rem' } }}>
                    {name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected ? (
                      <>
                        Selected — <strong style={{ color: '#C96F4A' }}>{selected.name}</strong>
                      </>
                    ) : (
                      'Pick one'
                    )}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ height: 2, width: '100%', my: 1.5, borderRadius: 2, background: 'linear-gradient(90deg,#D9A44133,transparent)' }} />
              {options.length === 0 ? (
                <Box
                  sx={{
                    border: '2px dashed #E7D6BC',
                    borderRadius: 6,
                    p: { xs: 3, md: 4 },
                    textAlign: 'center',
                    background: '#FFFDF8'
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ fontFamily: '"Fraunces",Georgia,serif', color: '#A8562F', mb: 0.5 }}
                  >
                    More treats coming soon
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    We&apos;re still curating this section — check back shortly.
                  </Typography>
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/admin')}
                    >
                      {hasTypeSections
                        ? 'Edit options in Admin → Hamper Types'
                        : 'Add options in Admin → Products'}
                    </Button>
                  )}
                </Box>
              ) : (
                <Grid container spacing={2.5}>
                  {options.map((p) => {
                    const id = p._id || p.id
                    const isSelected = selectedId === id
                    return (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={id}>
                        <Card
                          sx={{
                            height: '100%',
                            overflow: 'visible',
                            position: 'relative',
                            border: isSelected ? '2.5px solid #D9A441' : '1px solid #EFE3D0',
                            boxShadow: isSelected
                              ? '0 10px 28px rgba(217,164,65,0.35)'
                              : '0 4px 16px rgba(62,42,32,0.06)',
                            transform: isSelected ? 'translateY(-3px)' : 'none',
                            transition: 'all 0.25s ease',
                            '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 24px rgba(62,42,32,0.12)' }
                          }}
                        >
                          <CardActionArea onClick={() => togglePick(n, p)} sx={{ height: '100%', borderRadius: 5 }}>
                            <Box sx={{ position: 'relative' }}>
                              <CardMedia
                                component="img"
                                image={p.image}
                                alt={p.name}
                                sx={{ aspectRatio: '1/1', objectFit: 'cover', borderRadius: '20px 20px 0 0' }}
                              />
                              {isSelected && (
                                <CheckCircleIcon
                                  sx={{
                                    position: 'absolute',
                                    top: 10,
                                    right: 10,
                                    fontSize: 34,
                                    color: '#D9A441',
                                    bgcolor: '#fff',
                                    borderRadius: '50%',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                  }}
                                />
                              )}
                            </Box>
                            <CardContent sx={{ pb: 2 }}>
                              <Typography variant="subtitle1" fontWeight={600} noWrap title={p.name}>
                                {p.name}
                              </Typography>
                              {p.weight && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {p.weight}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: '#B98A2F', fontWeight: 600 }}>
                                Included
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    )
                  })}
                </Grid>
              )}
            </Box>
          )
        })
      )}

      {/* Sticky bottom bar — sits above the mobile bottom nav on small screens */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 56, md: 0 },
          left: 0,
          right: 0,
          zIndex: 20,
          background: 'rgba(255,253,248,0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #EFE3D0',
          px: 2,
          py: 1.75,
          pb: 'calc(14px + env(safe-area-inset-bottom))'
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: { xs: 1.25, sm: 2 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {hamperType?.name || 'Hamper'} · {pickedCount}/{totalSteps} picked
              </Typography>
              <Typography variant="h5" sx={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 700, color: '#C96F4A' }}>
                {formatINR(fixedTotal)}
              </Typography>
            </Box>
            {!complete && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: 'block', sm: 'none' }, textAlign: 'right', maxWidth: 160 }}
              >
                Select one from each section to continue
              </Typography>
            )}
          </Box>
          <Box sx={{ textAlign: { xs: 'stretch', sm: 'right' } }}>
            {!complete && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, mb: 0.75 }}>
                Select one from each section to continue
              </Typography>
            )}
            <Button
              variant="contained"
              size="large"
              disabled={!complete}
              onClick={handleAdd}
              endIcon={<ArrowForwardIcon />}
              sx={{ px: 4, width: { xs: '100%', sm: 'auto' } }}
            >
              {count > 0 ? 'Replace Hamper in Cart' : 'Add to Cart'}
            </Button>
          </Box>
        </Container>
      </Box>
    </Container>
  )
}
