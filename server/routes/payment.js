const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upiStatus, upiConfig, submitUpiReference } = require('../controllers/paymentController');

// Read-only status for the customer's own order (polling). Never changes state.
router.get('/upi/status', ...auth, upiStatus);

// Manual UPI (interim — no payment gateway).
// Customer pays in their own UPI app, then submits the 12-digit UTR.
// Nothing here marks an order paid; the admin verifies manually.
router.get('/upi/config', upiConfig);
router.post('/upi/submit-reference', ...auth, submitUpiReference);

// Razorpay: DISABLED (deferred). The controller is not required here so the
// server boots without it. To re-enable: restore
// controllers/razorpayController.js, require it above, re-add the webhook in
// server.js (before express.json()), and set RAZORPAY_* env vars.

module.exports = router;
