// Direct-UPI payment controller. NO payment gateway (no Razorpay/Stripe/PayPal).
// The backend generates the UPI URI from the SERVER-CALCULATED amount only.
//
// IMPORTANT: direct UPI provides no trusted payment callback. We NEVER mark
// an order "Paid" based on the user opening a UPI app, returning to the site,
// or clicking "I Have Completed Payment". Such a click only sets the order to
// "Pending Verification" for manual admin verification.
const Order = require('../models/Order');
const { prepareUpiOrder } = require('./orderController');

// POST /api/payment/upi/create
// Body: { hamperTypeId, selections, qty, addressId, upiTransactionReference }
// (same hamper-type contract as POST /api/orders).
// Validates + creates the order server-side, then returns payment details.
// The amount in the UPI URI always equals the backend-calculated order total.
async function createUpiPayment(req, res, next) {
  try {
    const result = await prepareUpiOrder({ userId: req.auth.uid, ...(req.body || {}) });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/payment/upi/status?orderNumber=...
// Returns current payment/order status. Does not verify with any bank.
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

// POST /api/payment/upi/confirm-paid-notification
// Body: { orderNumber }
// Customer says "I Have Completed Payment". This is a NOTIFICATION ONLY -
// it moves the order to "Pending Verification", never to "Paid".
async function confirmPaidNotification(req, res, next) {
  try {
    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber is required.' });

    const order = await Order.findOne({ orderNumber, userId: req.auth.uid });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.paymentMethod !== 'UPI') {
      return res.status(400).json({ error: 'This endpoint is only for UPI orders.' });
    }

    // Only transition from Pending -> Pending Verification. Never mark Paid here.
    if (order.paymentStatus === 'Pending') {
      order.paymentStatus = 'Pending Verification';
      order.orderStatus = 'Payment Verification Pending';
      await order.save();
    }

    res.json({
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      message:
        'Thank you! Your payment is marked as pending verification. We will confirm your order once the payment is verified.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUpiPayment, upiStatus, confirmPaidNotification };
