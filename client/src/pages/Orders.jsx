import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Typography
} from '@mui/material'
import { useApi } from '../lib/api.js'
import { formatINR } from '../utils/upi.js'

const PAYMENT_CHIP = {
  Pending: 'warning',
  'Pending Verification': 'info',
  Paid: 'success',
  Failed: 'error',
  Refunded: 'default'
}

const ORDER_CHIP = {
  'Order Placed': 'default',
  'Payment Verification Pending': 'info',
  Confirmed: 'primary',
  Preparing: 'warning',
  'Out for Delivery': 'warning',
  Delivered: 'success',
  Cancelled: 'error'
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return ''
  }
}

export default function Orders() {
  const api = useApi()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get('/orders/my-orders')
      .then((res) => {
        if (alive) {
          setOrders(res.data?.orders || [])
          setError('')
        }
      })
      .catch(() => {
        if (alive) setError('Could not load your orders. Please try again.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [api])

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} /> <Typography>Loading your orders…</Typography>
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert
          severity="error"
          action={<Button onClick={() => window.location.reload()}>Retry</Button>}
        >
          {error}
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        My Orders
      </Typography>

      {orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" gutterBottom>
            You haven’t placed any orders yet
          </Typography>
          <Typography color="text.secondary" paragraph>
            Build your first customized Diwali hamper and it will show up here.
          </Typography>
          <Button variant="contained" component={Link} to="/create-hamper">
            Build a Hamper
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {orders.map((o) => (
            <Card key={o._id} variant="outlined">
              <CardActionArea component={Link} to={`/orders/${o._id}`}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 2,
                      flexWrap: 'wrap'
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Order #{o.orderNumber || o._id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(o.createdAt)} · {(o.items || []).length} items
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 0.5 }}>
                        {formatINR(o.totalAmount)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <Chip
                        label={o.paymentStatus || 'Pending'}
                        color={PAYMENT_CHIP[o.paymentStatus] || 'default'}
                        size="small"
                      />
                      <Chip
                        label={o.orderStatus || 'Order Placed'}
                        color={ORDER_CHIP[o.orderStatus] || 'default'}
                        size="small"
                      />
                    </Stack>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  )
}
