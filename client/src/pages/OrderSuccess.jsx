import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  Typography
} from '@mui/material'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import { useApi } from '../lib/api.js'
import { formatINR } from '../utils/upi.js'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const api = useApi()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.get(`/orders/${orderId}`)
        const data = res.data?.order || res.data || null
        if (!cancelled) setOrder(data)
      } catch (e) {
        if (!cancelled) setError('Could not load your order details. It may still have been placed.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [api, orderId])

  const orderNumber = order?.orderNumber || order?.number || order?._id || orderId
  const orderTotal = order?.total ?? order?.amount ?? null

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, textAlign: 'center' }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <CheckCircleOutlineIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Order placed!
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Thank you — your order is with us.
          </Typography>

          <Card sx={{ mt: 3, mb: 3, textAlign: 'left' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Order number
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {String(orderNumber).slice(-8)}
                </Typography>
              </Box>
              {orderTotal !== null && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatINR(orderTotal)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {error && (
            <Alert severity="warning" sx={{ mb: 2, textAlign: 'left' }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            We&apos;ve received your order. Pay via UPI on the next step if you haven&apos;t,
            and we&apos;ll WhatsApp you once it&apos;s confirmed.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button variant="contained" onClick={() => navigate('/orders')}>
              View Orders
            </Button>
            <Button variant="outlined" onClick={() => navigate('/')}>
              Continue Shopping
            </Button>
          </Stack>
        </>
      )}
    </Container>
  )
}
