import { Link as RouterLink } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Divider from '@mui/material/Divider'
import { useSettings } from '../context/SettingsContext.jsx'

export default function Footer() {
  const { settings } = useSettings()
  const year = new Date().getFullYear()

  return (
    <Box
      component="footer"
      sx={{
        mt: 8,
        background: 'linear-gradient(180deg, #3E2A20 0%, #3E2A20 100%)',
        color: '#F3EAD9',
        pt: 6,
        pb: 3
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              variant="h5"
              sx={{ fontFamily: '"Fraunces",Georgia,serif', fontWeight: 700, color: '#F2DFAE' }}
            >
              {settings.logoText || 'Shreeji & Shreeji'}
            </Typography>
            <Box sx={{ height: 2, width: 48, my: 1.5, borderRadius: 2, bgcolor: '#D9A441' }} />
            <Typography variant="body2" sx={{ color: 'rgba(237,227,208,0.75)', maxWidth: 320 }}>
              {settings.footerNote ||
                'Handcrafted gift hampers of India\u2019s finest sweets and savouries \u2014 packed fresh to order and delivered with care.'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#F2DFAE' }}>
              Explore
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[
                { to: '/', label: 'Home' },
                { to: '/hampers', label: 'Build a hamper' },
                { to: '/about', label: 'About' },
                { to: '/contact', label: 'Contact' },
                { to: '/privacy', label: 'Privacy policy' },
                { to: '/terms', label: 'Terms' },
                { to: '/refund-policy', label: 'Refund policy' }
              ].map((l) => (
                <Link
                  key={l.to}
                  component={RouterLink}
                  to={l.to}
                  underline="hover"
                  sx={{ color: 'rgba(237,227,208,0.75)', fontSize: '0.9rem', '&:hover': { color: '#F2DFAE' } }}
                >
                  {l.label}
                </Link>
              ))}
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: '#F2DFAE' }}>
              Visit us
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(237,227,208,0.75)' }}>
              {settings.siteAddress}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(237,227,208,0.75)', mt: 1 }}>
              {settings.sitePhone} · {settings.siteEmail}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(237,227,208,0.75)', mt: 1 }}>
              {settings.siteHours}
            </Typography>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3, borderColor: 'rgba(217,164,65,0.25)' }} />
        <Typography variant="body2" align="center" sx={{ color: 'rgba(237,227,208,0.55)' }}>
          © {year} {settings.logoText || 'Shreeji & Shreeji'}. All rights reserved.
        </Typography>
      </Container>
    </Box>
  )
}
