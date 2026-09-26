import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
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
    return new Date(value).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function addressLines(a) {
  if (!a) return ''
  return [a.building, a.street, a.colony, a.area, a.city, a.state, a.pincode]
    .filter(Boolean)
    .join(', ')
}

export default function OrderDetails() {
  const { id } = useParams()
  const api = useApi()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    api
      .get(`/orders/${id}`)
      .then((res) => {
        if (alive) {
          setOrder(res.data?.order || null)
          setError('')
        }
      })
      .catch((e) => {
        if (alive)
          setError(
            e.response?.status === 404
              ? 'This order could not be found.'
              : 'Could not load this order. Please try again.'
          )
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [api, id])

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} /> <Typography>Loading order…</Typography>
        </Box>
      </Container>
    )
  }

  if (error || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Order not found.'}
        </Alert>
        <Button variant="outlined" component={Link} to="/orders">
          Back to My Orders
        </Button>
      </Container>
    )
  }

  const pendingVerification =
    order.paymentMethod === 'UPI' &&
    (order.paymentStatus === 'Pending' || order.paymentStatus === 'Pending Verification')

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Button component={Link} to="/orders" sx={{ mb: 2 }}>
        ← All orders
      </Button>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 2,
          flexWrap: 'wrap',
          mb: 3
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Order #{order.orderNumber || order._id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Placed on {formatDate(order.createdAt)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            label={order.paymentStatus || 'Pending'}
            color={PAYMENT_CHIP[order.paymentStatus] || 'default'}
          />
          <Chip label={order.orderStatus || 'Order Placed'} color={ORDER_CHIP[order.orderStatus] || 'default'} />
        </Stack>
      </Box>

      {pendingVerification && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Your UPI payment is pending verification. We verify every payment manually — our team
          will confirm it shortly, and you’ll see the status update here.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          {(order.items || []).map((item, i) => (
            <Box key={i}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, gap: 2 }}>
                <Box>
                  <Typography variant="body1" fontWeight={500}>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Section {item.section}
                    {item.weight ? ` · ${item.weight}` : ''}
                  </Typography>
                </Box>
                <Typography variant="body1">{formatINR(item.price)}</Typography>
              </Box>
              {i < order.items.length - 1 && <Divider />}
            </Box>
          ))}
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Total
            </Typography>
            <Typography variant="subtitle1" fontWeight={700}>
              {formatINR(order.totalAmount)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Delivery address
          </Typography>
          <Typography variant="body1">{addressLines(order.deliveryAddress)}</Typography>
          {order.deliveryAddress?.formattedAddress && (
            <Typography variant="body2" color="text.secondary">
              {order.deliveryAddress.formattedAddress}
            </Typography>
          )}
          {order.phone && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Contact: {order.phone}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Payment
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Method
            </Typography>
            <Typography variant="body2">UPI</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={order.paymentStatus || 'Pending'}
              color={PAYMENT_CHIP[order.paymentStatus] || 'default'}
              size="small"
            />
          </Box>
          {order.upiTransactionReference && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Transaction reference
              </Typography>
              <Typography variant="body2">{order.upiTransactionReference}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  )
}
