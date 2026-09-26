const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upiStatus, upiConfig, submitUpiReference } = require('../controllers/paymentController');
const {
  razorpayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require('../controllers/razorpayController');

// Read-only status for the customer's own order (polling). Never changes state.
router.get('/upi/status', ...auth, upiStatus);

// Manual UPI (interim — no payment gateway).
// Customer pays in their own UPI app, then submits the 12-digit UTR.
// Nothing here marks an order paid; the admin verifies manually.
router.get('/upi/config', upiConfig);
router.post('/upi/submit-reference', ...auth, submitUpiReference);

// Razorpay (payment aggregator) — DORMANT: no keys configured, nothing in the
// frontend calls these. Kept so the gateway can be re-enabled later by
// swapping the checkout UI back and setting RAZORPAY_* env vars.
// NOTE: POST /api/payment/razorpay/webhook is mounted in server.js BEFORE
// express.json() with express.raw(), so it is intentionally NOT here.
router.get('/razorpay/config', razorpayConfig);
router.post('/razorpay/create-order', ...auth, createRazorpayOrder);
router.post('/razorpay/verify', ...auth, verifyRazorpayPayment);

module.exports = router;
