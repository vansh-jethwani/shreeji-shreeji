import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useSettings } from '../context/SettingsContext.jsx'

const STEP_ICONS = [
  <CardGiftcardOutlinedIcon key="s1" sx={{ fontSize: 34, color: '#A8562F' }} />,
  <Inventory2OutlinedIcon key="s2" sx={{ fontSize: 34, color: '#A8562F' }} />,
  <LocalShippingOutlinedIcon key="s3" sx={{ fontSize: 34, color: '#A8562F' }} />
]

const STEP_FALLBACKS = [
  {
    title: 'Pick your favourites',
    text: 'Choose one treat from each section and craft a hamper that feels truly personal.'
  },
  {
    title: 'We handpack it fresh',
    text: 'Your hamper is packed the morning it ships — nestled in, sealed and gift-ready.'
  },
  {
    title: 'Delivered to their door',
    text: 'Carried with care to the people you love, anywhere we deliver.'
  }
]

export default function Home() {
  const navigate = useNavigate()
  const { settings, getSections } = useSettings()
  const sections = getSections()

  // Steps are settings-driven (admin-editable); fall back to house copy while loading.
  const steps = STEP_FALLBACKS.map((fb, i) => ({
    icon: STEP_ICONS[i],
    title: settings[`step${i + 1}Title`] || fb.title,
    text: settings[`step${i + 1}Text`] || fb.text
  }))

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(120deg, #FBF7EF 0%, #F6EEDC 55%, #F3E3C4 100%)'
        }}
      >
        {/* warm sun glow */}
        <Box
          sx={{
            position: 'absolute',
            width: 600,
            height: 600,
            right: -180,
            top: -180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(217,164,65,0.22) 0%, rgba(217,164,65,0) 65%)'
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 420,
            height: 420,
            left: -160,
            bottom: -200,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,111,74,0.14) 0%, rgba(201,111,74,0) 65%)'
          }}
        />
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center" sx={{ py: { xs: 6, md: 10 }, position: 'relative' }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant="overline"
                sx={{ color: '#B98A2F', fontWeight: 700, letterSpacing: '0.22em', mb: 1.5, display: 'block' }}
              >
                Handcrafted Gift Hampers
              </Typography>
              <Typography
                variant="h2"
                component="h1"
                sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, lineHeight: 1.1, mb: 2, color: '#3E2A20' }}
              >
                {settings.heroTitle || 'Hampers packed with love'}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4, maxWidth: 460, fontSize: '1.05rem', lineHeight: 1.7 }}>
                {settings.heroSubtitle ||
                  'Pick your favourite sweets and savouries, and we\u2019ll pack them into a beautiful gift box — fresh from our shelves to their doorstep.'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/hampers')}
                  sx={{ px: 4.5, py: 1.7, fontSize: '1.02rem' }}
                >
                  Build Your Hamper
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/about')}
                  sx={{ px: 4, py: 1.7 }}
                >
                  Our Story
                </Button>
              </Stack>
              <Typography variant="caption" sx={{ display: 'block', mt: 3.5, color: '#B98A2F', fontWeight: 700, letterSpacing: '0.08em' }}>
                {sections.length} SECTIONS · {sections.length} HANDPICKED TREATS · ONE BEAUTIFUL BOX
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }} sx={{ position: 'relative', minWidth: 0 }}>
              <Box
                sx={{
                  borderRadius: '36px',
                  overflow: 'hidden',
                  boxShadow: '0 28px 64px rgba(168,86,47,0.25)',
                  border: '8px solid #FFFDF8',
                  transform: { md: 'rotate(1.5deg)' }
                }}
              >
                <Box
                  component="img"
                  src={settings.heroImage || '/images/hero.jpg'}
                  alt="Gift hamper"
                  sx={{ width: '100%', height: { xs: 280, md: 430 }, objectFit: 'cover', display: 'block' }}
                />
              </Box>
              {/* hand-written style note */}
              <Box
                sx={{
                  position: 'absolute',
                  left: { xs: 12, md: -20 },
                  bottom: { xs: -14, md: 36 },
                  bgcolor: '#FFFDF8',
                  borderRadius: '20px',
                  px: 2.5,
                  py: 1.75,
                  boxShadow: '0 14px 34px rgba(62,42,32,0.16)',
                  border: '1px solid #EFE3D0',
                  transform: 'rotate(-2deg)'
                }}
              >
                <Typography variant="body2" fontWeight={700} sx={{ color: '#A8562F', fontFamily: '"Fraunces",Georgia,serif', fontSize: '1rem' }}>
                  Packed fresh this morning
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Sealed &amp; gift-ready
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
        {/* soft wave into next section */}
        <Box sx={{ display: 'block', lineHeight: 0, mt: 2 }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ width: '100%', height: 40, display: 'block' }}>
            <path d="M0,32 C240,8 480,8 720,24 C960,40 1200,40 1440,20 L1440,48 L0,48 Z" fill="#FBF7EF" />
          </svg>
        </Box>
      </Box>

      {/* How it works */}
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 5, md: 8 },
          // keep anchored jumps / sticky header from covering the heading
          scrollMarginTop: { xs: 72, md: 96 }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 5, px: 1 }}>
          <Typography
            variant="overline"
            sx={{ color: '#B98A2F', fontWeight: 700, letterSpacing: '0.22em', display: 'block', mb: 1 }}
          >
            How it works
          </Typography>
          <Typography
            variant="h3"
            sx={{ fontSize: { xs: '1.9rem', md: '2.5rem' }, lineHeight: 1.25, textWrap: 'balance' }}
          >
            {settings.stepsHeading || 'Three little steps to the perfect gift'}
          </Typography>
          <Box sx={{ height: 4, width: 72, mx: 'auto', mt: 2.5, borderRadius: 4, background: 'linear-gradient(90deg,#D9A441,#C96F4A)' }} />
        </Box>
        <Grid container spacing={3}>
          {steps.map((s, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.title}>
              <Card sx={{ p: 4, height: '100%', textAlign: 'center', position: 'relative', background: '#FFFDF8' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 14,
                    right: 22,
                    fontFamily: '"Fraunces",Georgia,serif',
                    fontSize: '3rem',
                    fontWeight: 700,
                    color: 'rgba(217,164,65,0.28)',
                    lineHeight: 1
                  }}
                >
                  {i + 1}
                </Box>
                <Box
                  sx={{
                    width: 76,
                    height: 76,
                    mx: 'auto',
                    mb: 2.5,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #F6E3D3, #F3D9BE)',
                    border: '1px solid #EFD9C2'
                  }}
                >
                  {s.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {s.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  {s.text}
                </Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/hampers')} sx={{ px: 5, py: 1.7, fontSize: '1rem' }}>
            Start Building
          </Button>
        </Box>
      </Container>

      {/* Story band */}
      <Box sx={{ background: '#F3EAD9', borderTop: '1px solid #EFE3D0', borderBottom: '1px solid #EFE3D0' }}>
        <Container maxWidth="md" sx={{ py: { xs: 6, md: 8 }, textAlign: 'center' }}>
          <Typography
            variant="overline"
            sx={{ color: '#B98A2F', fontWeight: 700, letterSpacing: '0.22em', display: 'block', mb: 1.5 }}
          >
            {settings.aboutTitle || 'Our shop'}
          </Typography>
          <Typography
            variant="h4"
            sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, lineHeight: 1.5, fontStyle: 'italic', color: '#3E2A20', mb: 3 }}
          >
            &ldquo;{settings.aboutText ||
              'We are a family-run sweets and namkeen shop. Every morning we make fresh mithai, and every hamper is packed to order — like we were packing it for our own family.'}&rdquo;
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/about')} sx={{ px: 4 }}>
            Read our story
          </Button>
        </Container>
      </Box>
    </Box>
  )
}
