import {
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import { useSettings } from '../context/SettingsContext.jsx'

const POINTS = [
  {
    title: 'Wholesale of Bikaji namkeens and sweets',
    text: 'We stock the full range — classic mithai, crunchy namkeen, dry fruits and gift-ready packs.'
  },
  {
    title: 'Hampers made to order',
    text: 'You pick six favourites, one from each section, and we compose and pack your hamper only after you order.'
  },
  {
    title: 'Made for gifting',
    text: 'Diwali, weddings, housewarmings or just because — choose a gift box, add a card, and send it across India.'
  },
  {
    title: 'Simple online ordering',
    text: 'Build your hamper on the site, check out in minutes and pay easily via UPI.'
  },
  {
    title: 'Bulk and corporate orders',
    text: 'Need many hampers for a team or an event? Message us on WhatsApp and we will work it out with you.'
  }
]

export default function About() {
  const { settings } = useSettings()

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        {settings.aboutTitle || 'About Shreeji & Shreeji'}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
        {settings.aboutText ||
          'Shreeji & Shreeji is a wholesale shop for Bikaji namkeens and sweets, now also packing customized gift hampers for everyday gifting.'}
      </Typography>

      <List>
        {POINTS.map((p) => (
          <ListItem key={p.title} alignItems="flex-start" sx={{ px: 0 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <CheckCircleOutlineIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={<Typography variant="subtitle1" fontWeight={600}>{p.title}</Typography>}
              secondary={p.text}
            />
          </ListItem>
        ))}
      </List>
    </Container>
  )
}
