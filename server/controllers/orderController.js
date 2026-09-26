const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const HamperType = require('../models/HamperType');
const { isAdminPhone } = require('../middleware/isAdmin');
const { generateOrderNumber, generateUpiUri } = require('../utils/upi');
const { getHamperConfig } = require('../utils/hamper');
const { getAllowedIdsPerSection } = require('../utils/hamperSections');

function validateAddress(addr) {
  const required = ['city', 'state', 'pincode'];
  for (const f of required) {
    if (!addr || !String(addr[f] || '').trim()) {
      return `Delivery address field "${f}" is required.`;
    }
  }
  return null;
}

function validatePhone(phone) {
  if (!phone || !/^[0-9+\-\s]{7,15}$/.test(String(phone).trim())) {
    return 'A valid contact number is required.';
  }
  return null;
}

function getMerchantConfig() {
  const merchantUpiId = process.env.MERCHANT_UPI_ID;
  const merchantName = process.env.MERCHANT_NAME || 'Shreeji & Shreeji';
  if (!merchantUpiId) {
    const err = new Error('UPI payments are not configured. Please contact support.');
    err.status = 500;
    throw err;
  }
  return { merchantUpiId, merchantName };
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/**
 * Core order-creation logic for UPI orders (the only payment method).
 *
 * New hamper-type contract:
 * - hamperTypeId (required): the HamperType the customer chose; must be active.
 * - selections (required iff type.customizable): { "<sectionNumber>": "<productId>" }
 *   with exactly one product per section 1..type.sectionCount
 *   (falls back to the settings hamperSectionCount when the type has none).
 *   Each selection must be one of that section's EFFECTIVE options: the type's
 *   custom productIds for the section when set, otherwise all AVAILABLE
 *   products of global section N. Products must be available:true.
 * - qty (1..10, default 1): number of hampers.
 * - addressId (required): one of the user's saved addresses.
 * - upiTransactionReference (optional): overrides the generated reference.
 *
 * Pricing: totalAmount = type.price x qty, calculated SERVER-SIDE. Any
 * client-sent total is ignored (the client never sends one).
 * Premade types ignore selections; their fixedItems are snapshotted into
 * the order (section 0, no productId).
 *
 * Returns { items, total, orderNumber, hamperType, qty, deliveryAddress,
 *           phone, upiTransactionReference }.
 */
async function buildValidatedOrder({
  userId,
  hamperTypeId,
  selections,
  qty,
  addressId,
  upiTransactionReference,
}) {
  // ---- qty ----
  let quantity = 1;
  if (qty !== undefined && qty !== null && qty !== '') {
    quantity = Number(qty);
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw badRequest('Quantity must be a whole number between 1 and 10.');
  }

  // ---- hamper type (must exist and be active) ----
  if (!hamperTypeId || !mongoose.Types.ObjectId.isValid(String(hamperTypeId))) {
    throw badRequest('Please choose a hamper.');
  }
  const type = await HamperType.findById(hamperTypeId).lean();
  if (!type || !type.active) {
    throw badRequest('The selected hamper is not available. Please choose another.');
  }

  // ---- section count: the type's own, else the admin settings fallback ----
  let sectionCount = Number(type.sectionCount);
  if (!Number.isInteger(sectionCount) || sectionCount < 1 || sectionCount > 20) {
    const cfg = await getHamperConfig();
    sectionCount = cfg.count;
  }
  const requiredSections = Array.from({ length: sectionCount }, (_, i) => i + 1);
  const hamperMsg = `Please select one item from each of the ${sectionCount} sections to complete your "${type.name}".`;

  let items;
  if (type.customizable) {
    if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
      throw badRequest(hamperMsg);
    }
    const productIds = requiredSections.map((s) => selections[String(s)]);
    if (productIds.some((id) => !id)) {
      throw badRequest(hamperMsg);
    }
    for (const id of productIds) {
      if (!mongoose.Types.ObjectId.isValid(String(id))) {
        throw badRequest('Invalid product selection.');
      }
    }

    // Each selection must be one of ITS section's effective options: the
    // type's custom productIds for that section when set, otherwise all
    // available products of the matching global section. Effective options
    // are available:true by construction.
    const allowedPerSection = await getAllowedIdsPerSection(type);
    for (let i = 0; i < sectionCount; i++) {
      if (!allowedPerSection[i].includes(String(productIds[i]))) {
        throw badRequest(hamperMsg);
      }
    }

    const uniqueIds = [...new Set(productIds.map(String))];
    if (uniqueIds.length !== sectionCount) {
      throw badRequest('Duplicate products selected. Select one product per section.');
    }

    const products = await Product.find({ _id: { $in: uniqueIds } });

    if (products.length !== sectionCount) {
      throw badRequest('One or more selected products were not found.');
    }

    // All must still be available (belt-and-braces; the allowed sets above
    // already only contain available products).
    const unavailable = products.filter((p) => !p.available);
    if (unavailable.length > 0) {
      throw badRequest(
        `"${unavailable[0].name}" is currently out of stock. Please choose another item.`
      );
    }

    const byId = new Map(products.map((p) => [String(p._id), p]));
    items = requiredSections.map((s) => {
      const p = byId.get(String(productIds[s - 1]));
      return {
        productId: p._id,
        name: p.name,
        price: p.price, // catalogue price snapshot (informational only)
        image: p.image,
        section: s, // builder section (custom options may come from other global sections)
        weight: p.weight,
        qty: 1,
      };
    });
  } else {
    // Premade hamper — fixed contents, no customization; selections ignored.
    const fixed = Array.isArray(type.fixedItems) ? type.fixedItems : [];
    items = fixed
      .filter((fi) => fi && String(fi.name || '').trim())
      .map((fi) => ({
        name: String(fi.name).trim(),
        price: 0, // included in the fixed hamper price
        image: '',
        section: 0,
        weight: String(fi.weight || '').trim(),
        qty: Math.min(99, Math.max(1, Number(fi.qty) || 1)),
      }));
    if (items.length === 0) {
      throw badRequest(`"${type.name}" has no items configured yet. Please choose another hamper.`);
    }
  }

  // ---- SERVER-CALCULATED total: fixed hamper price x qty ----
  const unitPrice = Number(type.price);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw badRequest('The selected hamper has an invalid price.');
  }
  const total = unitPrice * quantity;
  if (!(total > 0)) {
    throw badRequest('Invalid order total.');
  }

  // ---- delivery address: must be one of the user's saved addresses ----
  if (!addressId) {
    throw badRequest('Please select a delivery address.');
  }
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error('Account not found. Please sign in again.');
    err.status = 401;
    throw err;
  }
  const saved = (user.addresses || []).find((a) => String(a._id) === String(addressId));
  if (!saved) {
    throw badRequest('Please select a delivery address.');
  }
  const deliveryAddress = {
    building: saved.building || '',
    street: saved.street || '',
    colony: saved.colony || '',
    area: saved.area || '',
    city: saved.city || '',
    state: saved.state || '',
    pincode: saved.pincode || '',
    formattedAddress: saved.formattedAddress || '',
  };
  if (saved.latitude !== undefined && saved.latitude !== null) {
    deliveryAddress.latitude = saved.latitude;
  }
  if (saved.longitude !== undefined && saved.longitude !== null) {
    deliveryAddress.longitude = saved.longitude;
  }

  const addrError = validateAddress(deliveryAddress);
  if (addrError) {
    throw badRequest(addrError);
  }
  const phoneError = validatePhone(user.phone);
  if (phoneError) {
    throw badRequest(phoneError);
  }

  // Unique order number / UPI transaction reference, retry on collision
  let orderNumber;
  for (let attempt = 0; attempt < 5; attempt++) {
    orderNumber = generateOrderNumber();
    const exists = await Order.findOne({ orderNumber }).lean();
    if (!exists) break;
    orderNumber = null;
  }
  if (!orderNumber) {
    const err = new Error('Could not generate order reference. Please try again.');
    err.status = 500;
    throw err;
  }

  let txnRef = String(upiTransactionReference || '').trim().slice(0, 64);
  if (!txnRef) txnRef = orderNumber;

  return {
    items,
    total,
    orderNumber,
    hamperType: { id: type._id, name: type.name, customizable: !!type.customizable },
    qty: quantity,
    deliveryAddress,
    phone: String(user.phone).trim(),
    upiTransactionReference: txnRef,
  };
}

/**
 * Validates the hamper-type order, persists the Order, and builds the
 * direct-UPI payment details. Shared by POST /api/orders and
 * POST /api/payment/upi/create (same contract on both).
 */
async function prepareUpiOrder({ userId, hamperTypeId, selections, qty, addressId, upiTransactionReference }) {
  const { merchantUpiId, merchantName } = getMerchantConfig();

  const v = await buildValidatedOrder({
    userId,
    hamperTypeId,
    selections,
    qty,
    addressId,
    upiTransactionReference,
  });

  const order = await Order.create({
    orderNumber: v.orderNumber,
    userId,
    hamperTypeId: v.hamperType.id,
    hamperTypeName: v.hamperType.name,
    customizable: v.hamperType.customizable,
    qty: v.qty,
    items: v.items,
    totalAmount: v.total, // server-calculated source of truth
    deliveryAddress: v.deliveryAddress,
    phone: v.phone,
    paymentMethod: 'UPI',
    paymentStatus: 'Pending',
    orderStatus: 'Order Placed',
    upiTransactionReference: v.upiTransactionReference,
  });

  const upiUri = generateUpiUri({
    merchantUpiId,
    merchantName,
    amount: v.total,
    transactionReference: v.upiTransactionReference,
  });

  return {
    orderId: order._id,
    orderNumber: v.orderNumber,
    hamperTypeId: v.hamperType.id,
    hamperTypeName: v.hamperType.name,
    qty: v.qty,
    total: v.total, // read-only display value; backend-generated
    upiUri,
    merchantUpiId,
    merchantName,
    transactionReference: v.upiTransactionReference,
  };
}

// POST /api/orders — UPI-only order creation for a hamper type.
// Body: { hamperTypeId, selections?, qty?, addressId, upiTransactionReference? }
// (cash on delivery is not available).
async function createOrder(req, res, next) {
  try {
    const result = await prepareUpiOrder({ userId: req.auth.uid, ...(req.body || {}) });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/my-orders - current user's orders
async function myOrders(req, res, next) {
  try {
    const orders = await Order.find({ userId: req.auth.uid })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:id - owner or admin only
async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { orderNumber: id };

    const order = await Order.findOne(query).lean();
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    if (order.userId !== req.auth.uid && !isAdminPhone(req.auth.phone)) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    res.json({ order });
  } catch (err) {
    next(err);
  }
}

module.exports = { myOrders, getOrder, buildValidatedOrder, prepareUpiOrder, createOrder, getMerchantConfig };
