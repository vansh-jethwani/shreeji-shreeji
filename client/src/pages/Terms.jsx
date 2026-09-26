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

export default function Terms() {
  const { settings } = useSettings()
  const contact = settings?.siteEmail || 'care@shreeji-shreeji.in'
  const phone = settings?.sitePhone || ''

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Terms of Service
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: September 2026
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Section title="About this shop">
        <P>
          Shreeji &amp; Shreeji is a wholesale sweets and namkeen business selling customized
          Diwali gift hampers online. By placing an order with us, you agree to these terms.
        </P>
      </Section>

      <Section title="Accounts">
        <P>
          You sign in with just your name and mobile number — no passwords and no one-time
          passcodes. We do not use any third-party authentication provider. Your mobile number
          identifies your account, so please use a number you can be reached on.
        </P>
      </Section>

      <Section title="Orders and pricing">
        <P>
          Each hamper is built from six sections; an order is complete when you have chosen one
          item from each. Prices shown on the site are in Indian rupees and include everything
          you need to pay — the order total is calculated by our system and shown to you before
          you pay.
        </P>
      </Section>

      <Section title="Payments — UPI only">
        <P>
          We accept UPI payments only. There is no cash-on-delivery and no card or net-banking
          option on this site. After you pay through your UPI app, tap “I Have Completed
          Payment” so we know to look for it. Every payment is verified manually by our team,
          and your order stays “Pending Verification” until we confirm it.
        </P>
      </Section>

      <Section title="Delivery">
        <P>
          We deliver to the address you select at checkout. Please make sure the address and
          pincode are correct — we cannot re-route a hamper once it has left our shop. Delivery
          timelines shared with you are estimates; festival-season demand can occasionally cause
          delays.
        </P>
      </Section>

      <Section title="Cancellations">
        <P>
          You can ask us to cancel an order before it is dispatched. Once a hamper is out for
          delivery, we may not be able to stop it. Contact us as early as possible and we will
          do our best.
        </P>
      </Section>

      <Section title="Contact us">
        <P>
          Questions about these terms? Reach us at {contact}
          {phone ? ` or ${phone}` : ''}.
        </P>
      </Section>
    </Container>
  )
}
