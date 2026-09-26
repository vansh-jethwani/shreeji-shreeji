import { Box, Container, Divider, Typography } from '@mui/material'
import { useSettings } from '../context/SettingsContext.jsx'

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function P({ children }) {
  return (
    <Typography variant="body1" paragraph color="text.secondary">
      {children}
    </Typography>
  )
}

export default function Privacy() {
  const { settings } = useSettings()
  const contact = settings?.siteEmail || 'care@shreeji-shreeji.in'
  const phone = settings?.sitePhone || ''

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: September 2026
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Section title="What we collect">
        <P>
          To run this shop we store a small amount of information: your name, your mobile
          number, and the delivery addresses you save. When you order, we also keep your order
          details — the items you chose, the delivery address, the amount, and the status of
          your UPI payment.
        </P>
      </Section>

      <Section title="Sign-in — no passwords, no OTPs, no third-party auth">
        <P>
          Signing in uses just your name and mobile number. There are no passwords to remember
          and no one-time passcodes. We do not use any third-party authentication provider —
          everything stays between you and Shreeji &amp; Shreeji.
        </P>
      </Section>

      <Section title="Where your data lives">
        <P>
          Your data is stored in our own MongoDB database. We do not sell your information, and
          we do not share it with advertisers or any third-party services except where strictly
          needed to run the shop (for example, hosting and delivery).
        </P>
      </Section>

      <Section title="Payments">
        <P>
          Payments are accepted via UPI only, paid directly by you through your own UPI app. We
          do not store your bank details, UPI PINs, or payment credentials — those never touch
          our systems. We only record the order amount and payment status so we can verify and
          fulfil your order.
        </P>
      </Section>

      <Section title="Your choices">
        <P>
          You can update your name and saved addresses from your profile page, and delete any
          address you no longer use. If you would like your account and data removed entirely,
          just contact us and we will take care of it.
        </P>
      </Section>

      <Section title="Contact us">
        <P>
          Questions about this policy? Reach us at {contact}
          {phone ? ` or ${phone}` : ''}.
        </P>
      </Section>
    </Container>
  )
}
