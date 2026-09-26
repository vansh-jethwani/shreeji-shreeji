const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createUpiPayment,
  upiStatus,
  confirmPaidNotification,
} = require('../controllers/paymentController');

// Direct UPI only. No Razorpay / Stripe / PayPal routes exist here.

router.post('/upi/create', ...auth, createUpiPayment);
router.get('/upi/status', ...auth, upiStatus);
router.post('/upi/confirm-paid-notification', ...auth, confirmPaidNotification);

module.exports = router;
