const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { myOrders, getOrder, createOrder } = require('../controllers/orderController');

// Orders are UPI-only. New orders are created via POST /api/orders
// (same hamper-type contract as POST /api/payment/upi/create).
// Cash on delivery is not available.

// POST /api/orders
// Body: { hamperTypeId, selections?, qty?, addressId, upiTransactionReference? }
router.post('/', ...auth, createOrder);

// IMPORTANT: /my-orders must be registered before /:id
router.get('/my-orders', ...auth, myOrders);
router.get('/:id', ...auth, getOrder);

module.exports = router;
