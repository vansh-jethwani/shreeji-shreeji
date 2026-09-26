import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { useCart } from '../context/CartContext.jsx'
import { formatINR } from '../utils/upi.js'

function HamperItems({ hamper }) {
  const customizable = hamper.customizable !== false
  if (customizable) {
    return (
      <Stack spacing={1}>
        {(hamper.items || []).map((item, i) => (
          <Box key={item.productId || i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {item.image && (
              <Box
                component="img"
                src={item.image}
                alt={item.name}
                sx={{ width: 48, height: 48, borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {item.name}
              </Typography>
              {item.weight && (
                <Typography variant="caption" color="text.secondary">
                  {item.weight}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#B98A2F', fontWeight: 600, flexShrink: 0 }}>
              Included
            </Typography>
          </Box>
        ))}
      </Stack>
    )
  }
  // Premade hamper — fixed contents snapshot.
  return (
    <Stack spacing={1}>
      {(hamper.items || []).map((item, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {item.name}
              {Number(item.qty) > 1 ? ` × ${item.qty}` : ''}
            </Typography>
            {item.weight && (
              <Typography variant="caption" color="text.secondary">
                {item.weight}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
      {hamper.qty > 1 && (
        <Typography variant="caption" color="text.secondary">
          {hamper.qty} hampers
        </Typography>
      )}
    </Stack>
  )
}

export default function Cart() {
  const navigate = useNavigate()
  const { hampers, total, removeHamper } = useCart()

  if (hampers.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <ShoppingBagOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Your cart is empty
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose a hamper and make it yours.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/hampers')}>
          Choose a hamper
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Your cart
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {hampers.length} {hampers.length === 1 ? 'hamper' : 'hampers'} in your cart.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={2}>
            {hampers.map((hamper, idx) => (
              <Card key={hamper.id}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {hamper.hamperTypeName || `Hamper ${idx + 1}`}
                      </Typography>
                      <Chip
                        label={hamper.customizable === false ? 'Ready to gift' : 'Customized'}
                        size="small"
                        sx={{
                          mt: 0.5,
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          background: hamper.customizable === false ? '#D9A441' : '#3E2A20',
                          color: hamper.customizable === false ? '#3E2A20' : '#FBF7EF'
                        }}
                      />
                    </Box>
                    <IconButton
                      aria-label={`Remove hamper ${idx + 1}`}
                      size="small"
                      color="error"
                      onClick={() => removeHamper(hamper.id)}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                  <HamperItems hamper={hamper} />
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button size="small" variant="outlined" onClick={() => navigate('/hampers')}>
                      Choose another
                    </Button>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {formatINR(hamper.total)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 96 } }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Order summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatINR(total)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Delivery
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  Calculated at checkout
                </Typography>
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Total
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  {formatINR(total)}
                </Typography>
              </Box>
              <Button variant="contained" fullWidth size="large" onClick={() => navigate('/checkout')}>
                Proceed to Checkout
              </Button>
              <Button fullWidth sx={{ mt: 1 }} onClick={() => navigate('/')}>
                Continue shopping
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}
