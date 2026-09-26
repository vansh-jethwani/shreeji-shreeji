// Payment status reads + manual-UPI endpoints for the customer's own orders.
//
// INTERIM MANUAL UPI FLOW (no payment gateway):
//   1. Customer places the order -> paymentStatus "Pending".
//   2. Checkout shows the merchant UPI ID + exact-amount QR.
//   3. Customer pays in their own UPI app, then submits the 12-digit UTR
//      via POST /api/payment/upi/submit-reference -> "Pending Verification".
//   4. The admin verifies the money in their bank/UPI app and marks the
//      order Paid via PATCH /api/admin/orders/:id/verify-payment (admin-only).
//
// There is intentionally NO customer-accessible endpoint that marks an order
// paid — a submitted UTR is a claim, not proof. Only manual admin
// verification (or, later, a payment gateway) completes payment.
//
// Razorpay endpoints live in razorpayController.js and are currently dormant
// (no keys configured). They can be re-enabled later without touching this flow.
const Order = require('../models/Order');

// GET /api/payment/upi/status?orderNumber=...
// Returns current payment/order status for polling. Read-only — it never
// changes payment state and does not verify with any bank.
async function upiStatus(req, res, next) {
  try {
    const { orderNumber } = req.query;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber is required.' });

    const order = await Order.findOne({ orderNumber, userId: req.auth.uid })
      .select('orderNumber paymentStatus orderStatus totalAmount paymentMethod')
      .lean();
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    res.json({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { upiStatus, upiConfig, submitUpiReference };

// GET /api/payment/upi/config
// Public: the merchant UPI ID is payment-destination info (it is printed on
// the QR the customer scans), not a secret. 503 when UPI collection is not
// configured.
async function upiConfig(req, res, next) {
  try {
    const upiId = (process.env.MERCHANT_UPI_ID || '').trim();
    const merchantName = (process.env.MERCHANT_NAME || 'Shreeji & Shreeji').trim();
    if (!upiId) {
      return res.status(503).json({ error: 'UPI payments are not configured yet. Please try again later.' });
    }
    res.json({ upiId, merchantName });
  } catch (err) {
    next(err);
  }
}

// POST /api/payment/upi/submit-reference  (auth)
// Body: { orderNumber, upiRef }
// Records the customer's 12-digit UTR after they paid manually in their UPI
// app. This NEVER marks the order paid — it only files the reference and
// moves the order to "Pending Verification" for manual admin verification.
// Re-submitting while still unverified overwrites the reference (typo fix).
async function submitUpiReference(req, res, next) {
  try {
    const { orderNumber, upiRef } = req.body || {};
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber is required.' });
    const ref = String(upiRef || '').replace(/[\s-]+/g, '');
    if (!/^\d{12}$/.test(ref)) {
      return res.status(400).json({
        error: 'Please enter the 12-digit UTR / UPI reference number shown in your payment app.',
      });
    }
    const order = await Order.findOne({ orderNumber, userId: req.auth.uid });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!['Pending', 'Pending Verification'].includes(order.paymentStatus)) {
      return res.status(400).json({
        error: `This order is already ${String(order.paymentStatus).toLowerCase()} — nothing to submit.`,
      });
    }
    order.upiTransactionReference = ref;
    order.paymentStatus = 'Pending Verification';
    if (order.orderStatus === 'Order Placed') order.orderStatus = 'Payment Verification Pending';
    await order.save();
    res.json({
      ok: true,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
    });
  } catch (err) {
    next(err);
  }
}
