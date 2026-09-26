const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    // Absent for premade-hamper fixed items (they are not catalogue products).
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    name: { type: String, required: true },
    // Catalogue price snapshot at order time. The order total is ALWAYS the
    // hamper type's fixed price x qty (totalAmount) — never the sum of items.
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    // 1..20 = builder section; 0 = premade fixed item (no section).
    section: { type: Number, required: true, min: 0, max: 20 },
    weight: { type: String, default: '' },
    qty: { type: Number, default: 1, min: 1, max: 99 },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    building: { type: String, trim: true },
    street: { type: String, trim: true },
    colony: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    formattedAddress: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true }, // MongoDB user _id (string)
    // The hamper type the customer chose. totalAmount = hamper type price x qty.
    hamperTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HamperType',
      required: true,
      index: true,
    },
    hamperTypeName: { type: String, required: true, trim: true }, // snapshot
    customizable: { type: Boolean, required: true, default: true },
    qty: { type: Number, required: true, default: 1, min: 1, max: 10 },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 }, // server-calculated
    deliveryAddress: { type: deliveryAddressSchema, required: true },
    phone: { type: String, required: true, trim: true },
    paymentMethod: { type: String, required: true, enum: ['UPI'] }, // UPI only - no COD, no gateways
    paymentStatus: {
      type: String,
      required: true,
      enum: ['Pending', 'Pending Verification', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    orderStatus: {
      type: String,
      required: true,
      enum: [
        'Order Placed',
        'Payment Verification Pending',
        'Confirmed',
        'Preparing',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
      ],
      default: 'Order Placed',
    },
    upiTransactionReference: { type: String, index: true, sparse: true },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
