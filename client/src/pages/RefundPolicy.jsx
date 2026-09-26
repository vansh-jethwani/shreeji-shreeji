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

export default function RefundPolicy() {
  const { settings } = useSettings()
  const contact = settings?.siteEmail || 'care@shreeji-shreeji.in'
  const phone = settings?.sitePhone || ''

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Refund Policy
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: September 2026
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Section title="How refunds work here">
        <P>
          We accept UPI payments only, paid directly by you through your own UPI app. That
          means refunds are handled personally by our team, not automatically through a
          payment gateway.
        </P>
      </Section>

      <Section title="When you can get a refund">
        <P>
          If we have to cancel your order (for example, an item goes out of stock or we cannot
          deliver to your pincode), you will receive a full refund of the amount you paid. If
          your hamper arrives damaged or incorrect, tell us within 24 hours of delivery with a
          photo, and we will make it right — a replacement or a refund, whichever you prefer.
        </P>
      </Section>

      <Section title="Payment still unverified?">
        <P>
          Every UPI payment is verified manually by our team. If you paid but your order is
          still showing “Pending Verification”, please contact us before paying again — paying
          twice is the most common reason refunds are needed, and we would rather help you
          avoid it.
        </P>
      </Section>

      <Section title="How the money reaches you">
        <P>
          Approved refunds are sent back to the same UPI ID or bank account you paid from,
          usually within 5–7 working days of approval. We will share the refund reference with
          you so you can track it.
        </P>
      </Section>

      <Section title="Contact us">
        <P>
          To request a refund or ask about one, reach us at {contact}
          {phone ? ` or ${phone}` : ''}. Please keep your order number handy so we can help
          you faster.
        </P>
      </Section>
    </Container>
  )
}
