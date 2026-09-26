import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Link,
  Typography
} from '@mui/material'
import PhoneIcon from '@mui/icons-material/Phone'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { useSettings } from '../context/SettingsContext.jsx'

function InfoCard({ icon, title, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          {icon}
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  )
}

export default function Contact() {
  const { settings } = useSettings()

  const phone = settings.sitePhone || ''
  const whatsappDigits = (settings.siteWhatsapp || '').replace(/\D/g, '')
  const email = settings.siteEmail || ''
  const address = settings.siteAddress || ''
  const hours = settings.siteHours || ''

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Contact us
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Call, WhatsApp or write to us — we are happy to help with orders, bulk hampers and anything else.
      </Typography>

      <Grid container spacing={2}>
        {phone && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoCard icon={<PhoneIcon color="primary" />} title="Phone">
              <Link href={`tel:${phone.replace(/\s/g, '')}`} underline="hover" variant="body1">
                {phone}
              </Link>
            </InfoCard>
          </Grid>
        )}

        {whatsappDigits && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoCard icon={<WhatsAppIcon color="primary" />} title="WhatsApp">
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Fastest for hamper queries and bulk orders.
              </Typography>
              <Button
                variant="contained"
                startIcon={<WhatsAppIcon />}
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat on WhatsApp
              </Button>
            </InfoCard>
          </Grid>
        )}

        {email && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoCard icon={<EmailIcon color="primary" />} title="Email">
              <Link href={`mailto:${email}`} underline="hover" variant="body1">
                {email}
              </Link>
            </InfoCard>
          </Grid>
        )}

        {hours && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoCard icon={<AccessTimeIcon color="primary" />} title="Shop hours">
              <Typography variant="body1">{hours}</Typography>
            </InfoCard>
          </Grid>
        )}

        {address && (
          <Grid size={{ xs: 12 }}>
            <InfoCard icon={<LocationOnIcon color="primary" />} title="Visit us">
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {address}
              </Typography>
            </InfoCard>
          </Grid>
        )}
      </Grid>
    </Container>
  )
}
