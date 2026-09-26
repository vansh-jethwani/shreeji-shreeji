// Admin routes. All require JWT auth + admin check (server-side).
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/isAdmin');
const { getHamperConfig } = require('../utils/hamper');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Setting = require('../models/Setting');
const HamperType = require('../models/HamperType');

router.use(...auth, isAdmin);

// ---------- Site settings ----------
// PUT /api/admin/settings  Body: { settings: { key: value } } — upserts each key.
router.put('/settings', async (req, res, next) => {
  try {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'Body must be { settings: { key: value } }.' });
    }
    const keys = Object.keys(settings).filter((k) => k && typeof k === 'string');
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No settings provided.' });
    }
    // Sanitize the hamper builder settings so a bad value can't break the shop.
    if (settings.hamperSectionCount !== undefined) {
      const n = Number(settings.hamperSectionCount);
      if (!Number.isInteger(n) || n < 1 || n > 20) {
        return res.status(400).json({ error: 'hamperSectionCount must be a whole number between 1 and 20.' });
      }
      settings.hamperSectionCount = n;
    }
    if (settings.hamperSectionNames !== undefined && !Array.isArray(settings.hamperSectionNames)) {
      return res.status(400).json({ error: 'hamperSectionNames must be an array of strings.' });
    }
    await Promise.all(
      keys.map((key) =>
        Setting.findOneAndUpdate(
          { key: key.trim() },
          { $set: { value: settings[key] } },
          { upsert: true, new: true, runValidators: true }
        )
      )
    );
    const docs = await Setting.find({ key: { $in: keys.map((k) => k.trim()) } }).lean();
    const out = {};
    for (const d of docs) out[d.key] = d.value;
    res.json({ settings: out });
  } catch (err) {
    next(err);
  }
});

// ---------- Products ----------
router.get('/products', async (req, res, next) => {
  try {
    const products = await Product.find({}).sort({ section: 1, name: 1 }).lean();
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

router.post('/products', async (req, res, next) => {
  try {
    const { name, description, image, price, section, weight, quantity, available } = req.body;
    if (!name || price === undefined || !section) {
      return res.status(400).json({ error: 'name, price and section are required.' });
    }
    const { count: sectionCount } = await getHamperConfig();
    if (!Number.isInteger(section) || section < 1 || section > sectionCount) {
      return res.status(400).json({ error: `section must be a whole number between 1 and ${sectionCount}.` });
    }
    const product = await Product.create({
      name, description, image, price, section, weight, quantity, available,
    });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

router.patch('/products/:id', async (req, res, next) => {
  try {
    const allowed = ['name', 'description', 'image', 'price', 'section', 'weight', 'quantity', 'available'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (update.section !== undefined) {
      const { count: sectionCount } = await getHamperConfig();
      if (!Number.isInteger(update.section) || update.section < 1 || update.section > sectionCount) {
        return res.status(400).json({ error: `section must be a whole number between 1 and ${sectionCount}.` });
      }
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
});

// ---------- Hamper types ----------
// Admin-managed "choose your hamper" catalogue: customizable sizes with a
// fixed price, and premade hampers with fixed contents.

function slugifyHamperName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

// Unique slug, appending -2, -3... on clash (excluding the doc being updated).
async function uniqueHamperSlug(base, excludeId) {
  const baseSlug = slugifyHamperName(base) || 'hamper';
  let candidate = baseSlug;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await HamperType.findOne(query).select('_id').lean();
    if (!exists) return candidate;
    candidate = `${baseSlug}-${n}`;
    n += 1;
  }
}

// Keep only rows with a name; trim everything; clamp qty to 1..99.
function sanitizeFixedItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const name = String(row.name || '').trim();
    if (!name) continue;
    let qty = Number(row.qty);
    if (!Number.isInteger(qty) || qty < 1) qty = 1;
    if (qty > 99) qty = 99;
    out.push({ name: name.slice(0, 120), weight: String(row.weight || '').trim().slice(0, 40), qty });
  }
  return out;
}

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

// Validates a hamper-type body. isCreate=true requires name + price.
// Returns { errors, fields } where fields holds the sanitized update.
function validateHamperTypeInput(body, isCreate) {
  const errors = [];
  const fields = {};
  const b = body || {};

  if (b.name !== undefined || isCreate) {
    const name = String(b.name || '').trim();
    if (!name) errors.push('name is required.');
    else fields.name = name.slice(0, 120);
  }
  if (b.price !== undefined || isCreate) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) errors.push('price must be a number >= 0.');
    else fields.price = price;
  }
  if (b.sectionCount !== undefined) {
    const n = Number(b.sectionCount);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      errors.push('sectionCount must be a whole number between 1 and 20.');
    } else fields.sectionCount = n;
  } else if (isCreate) {
    fields.sectionCount = 6;
  }
  if (b.customizable !== undefined) {
    const v = coerceBoolean(b.customizable);
    if (v === undefined) errors.push('customizable must be true or false.');
    else fields.customizable = v;
  } else if (isCreate) {
    fields.customizable = true;
  }
  if (b.image !== undefined) fields.image = String(b.image || '').trim().slice(0, 500);
  else if (isCreate) fields.image = '';
  if (b.description !== undefined) fields.description = String(b.description || '').trim().slice(0, 1000);
  else if (isCreate) fields.description = '';
  if (b.active !== undefined) {
    const v = coerceBoolean(b.active);
    if (v === undefined) errors.push('active must be true or false.');
    else fields.active = v;
  } else if (isCreate) {
    fields.active = true;
  }
  if (b.sortOrder !== undefined) {
    const n = Number(b.sortOrder);
    if (!Number.isFinite(n)) errors.push('sortOrder must be a number.');
    else fields.sortOrder = n;
  } else if (isCreate) {
    fields.sortOrder = 0;
  }
  if (b.fixedItems !== undefined) fields.fixedItems = sanitizeFixedItems(b.fixedItems);
  else if (isCreate) fields.fixedItems = [];

  // Per-section options. sections[i] is builder section i+1.
  // { name, productIds } — productIds empty means "all available products of
  // the global section" (the old behaviour). Invalid ids are dropped, dupes
  // removed; existence is verified in the route handlers (async).
  if (b.sections !== undefined) {
    if (!Array.isArray(b.sections)) {
      errors.push('sections must be an array.');
    } else {
      const before = errors.length;
      const sanitized = [];
      for (let si = 0; si < b.sections.length; si++) {
        const s = b.sections[si];
        if (!s || typeof s !== 'object' || Array.isArray(s)) {
          errors.push(`sections[${si}] must be an object.`);
          break;
        }
        if (s.name !== undefined && typeof s.name !== 'string') {
          errors.push(`sections[${si}].name must be a string.`);
          break;
        }
        const name = typeof s.name === 'string' ? s.name.trim().slice(0, 60) : '';
        let productIds = [];
        if (s.productIds !== undefined) {
          if (!Array.isArray(s.productIds)) {
            errors.push(`sections[${si}].productIds must be an array.`);
            break;
          }
          const seen = new Set();
          for (const rawId of s.productIds) {
            const sid = String(rawId === null || rawId === undefined ? '' : rawId);
            if (!mongoose.Types.ObjectId.isValid(sid)) continue; // drop invalid
            if (seen.has(sid)) continue; // dedupe
            seen.add(sid);
            productIds.push(new mongoose.Types.ObjectId(sid));
          }
        }
        sanitized.push({ name, productIds });
      }
      if (errors.length === before) {
        if (sanitized.length < 1 || sanitized.length > 20) {
          errors.push('sections must have between 1 and 20 entries.');
        } else {
          fields.sections = sanitized;
        }
      }
    }
  } else if (isCreate) {
    // Default: sectionCount empty entries -> old behaviour (all products per section).
    const n = fields.sectionCount || 6;
    fields.sections = Array.from({ length: n }, () => ({ name: '', productIds: [] }));
  }

  return { errors, fields };
}

// 400 if any id does not reference an existing product.
async function assertSectionProductsExist(productIds) {
  if (!productIds || productIds.length === 0) return;
  const found = await Product.find({ _id: { $in: productIds } }).select('_id').lean();
  if (found.length !== productIds.length) {
    const err = new Error('One or more selected products do not exist.');
    err.status = 400;
    throw err;
  }
}

// GET /api/admin/hamper-types — all types (including inactive), admin order.
// sections are returned raw: [ { name, productIds: [id strings] } ]
// (no population — the admin UI already has the product list).
router.get('/hamper-types', async (req, res, next) => {
  try {
    const docs = await HamperType.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    const hamperTypes = docs.map((t) => ({
      ...t,
      sections: (Array.isArray(t.sections) ? t.sections : []).map((s) => ({
        name: s && typeof s.name === 'string' ? s.name : '',
        productIds: (s && Array.isArray(s.productIds) ? s.productIds : []).map((id) => String(id)),
      })),
    }));
    res.json({ hamperTypes });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/hamper-types — create; slug auto-generated from name
router.post('/hamper-types', async (req, res, next) => {
  try {
    const { errors, fields } = validateHamperTypeInput(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }
    await assertSectionProductsExist(fields.sections.flatMap((s) => s.productIds));
    fields.slug = await uniqueHamperSlug(fields.name);
    const hamperType = await HamperType.create(fields);
    res.status(201).json({ hamperType });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/hamper-types/:id — update; slug regenerated when name changes
// PATCH is accepted as an alias (the admin UI sends PATCH).
const updateHamperType = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Hamper type not found.' });
    }
    const existing = await HamperType.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Hamper type not found.' });
    }
    const { errors, fields } = validateHamperTypeInput(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }
    if (fields.sections) {
      await assertSectionProductsExist(fields.sections.flatMap((s) => s.productIds));
      // Keep sectionCount in sync: the sections array is authoritative.
      const effectiveCount =
        fields.sectionCount !== undefined ? fields.sectionCount : existing.sectionCount;
      if (fields.sections.length !== effectiveCount) {
        fields.sectionCount = fields.sections.length;
      }
    }
    if (fields.name && fields.name !== existing.name) {
      fields.slug = await uniqueHamperSlug(fields.name, existing._id);
    }
    Object.assign(existing, fields);
    await existing.save();
    res.json({ hamperType: existing.toObject() });
  } catch (err) {
    next(err);
  }
};
router.put('/hamper-types/:id', updateHamperType);
router.patch('/hamper-types/:id', updateHamperType);

// DELETE /api/admin/hamper-types/:id
router.delete('/hamper-types/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Hamper type not found.' });
    }
    const hamperType = await HamperType.findByIdAndDelete(id);
    if (!hamperType) {
      return res.status(404).json({ error: 'Hamper type not found.' });
    }
    res.json({ message: 'Hamper type deleted.' });
  } catch (err) {
    next(err);
  }
});

// ---------- Image upload ----------
// POST /api/admin/upload — upload a hamper-type image (admin only).
// multipart/form-data with a single file in the "image" field.
// Images only (jpeg/png/webp/gif), 5 MB max. Returns:
//   { url: "/uploads/hamper-types/<unique-name>.jpg" }
// The returned url is site-relative — save it as the hamper type's image.
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'hamper-types');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const hamperImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(String(file.originalname || '')).toLowerCase();
      const safeExt = IMAGE_EXTENSIONS.has(ext) ? ext : '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (IMAGE_MIMETYPES.has(file.mimetype)) return cb(null, true);
    const err = new Error('Only image files are allowed (jpeg, png, webp, gif).');
    err.status = 400;
    return cb(err);
  },
});

router.post('/upload', (req, res, next) => {
  hamperImageUpload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') err.message = 'Image must be 5 MB or smaller.';
      err.status = err.status || 400;
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image received. Send a file in the "image" field.' });
    }
    res.json({ url: `/uploads/hamper-types/${req.file.filename}` });
  });
});

// ---------- Orders ----------
router.get('/orders', async (req, res, next) => {
  try {
    const { search, paymentStatus, orderStatus, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (orderStatus) filter.orderStatus = orderStatus;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit));
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Math.min(100, Number(limit))).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ orders, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// Verify a direct-UPI payment AFTER manual business verification.
// Only Pending Verification -> Paid is allowed here. Customers can never
// call this endpoint (admin-only).
router.patch('/orders/:id/verify-payment', async (req, res, next) => {
  try {
    const { paymentStatus, note } = req.body; // paymentStatus: 'Paid' | 'Failed' | 'Refunded'
    const allowed = ['Paid', 'Failed', 'Refunded'];
    if (!allowed.includes(paymentStatus)) {
      return res.status(400).json({ error: `paymentStatus must be one of: ${allowed.join(', ')}` });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (order.paymentMethod !== 'UPI') {
      return res.status(400).json({ error: 'Payment verification is only for UPI orders.' });
    }
    if (order.paymentStatus !== 'Pending Verification' && order.paymentStatus !== 'Pending') {
      return res.status(400).json({ error: `Cannot verify payment from status "${order.paymentStatus}".` });
    }
    order.paymentStatus = paymentStatus;
    if (paymentStatus === 'Paid') {
      order.paidAt = new Date();
      if (order.orderStatus === 'Payment Verification Pending') {
        order.orderStatus = 'Confirmed';
      }
    }
    await order.save();
    res.json({ order, note: note || undefined });
  } catch (err) {
    next(err);
  }
});

// ---------- Razorpay payment reconciliation ----------
// POST /api/admin/payments/reconcile
// Safety net for orders stuck in "Payment Verification Pending" (e.g. the
// customer paid but the webhook never arrived). For each candidate order it
// re-checks Razorpay server-side and marks captured payments paid.
// Each order is wrapped in try/catch so one failure never aborts the sweep.
router.post('/payments/reconcile', async (req, res, next) => {
  try {
    const { getRazorpay, markPaid } = require('../controllers/razorpayController');
    const instance = getRazorpay();
    if (!instance) {
      return res.status(503).json({ error: 'Razorpay is not configured.' });
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const candidates = await Order.find({
      orderStatus: 'Payment Verification Pending',
      paymentStatus: { $ne: 'Paid' },
      razorpayOrderId: { $exists: true, $ne: null },
      updatedAt: { $lt: tenMinutesAgo },
    }).select('_id orderNumber');

    let checked = 0;
    let confirmed = 0;
    for (const stub of candidates) {
      checked += 1;
      try {
        const order = await Order.findById(stub._id);
        if (!order || order.paymentStatus === 'Paid' || !order.razorpayOrderId) continue;
        const resp = await instance.orders.fetchPayments(order.razorpayOrderId);
        const items = (resp && resp.items) || [];
        const expectedPaise = Math.round(Number(order.totalAmount) * 100);
        const captured = items.find(
          (p) => p.status === 'captured' && Number(p.amount) === expectedPaise
        );
        if (captured) {
          await markPaid(order, captured.id);
          confirmed += 1;
          console.log('[reconcile] order confirmed:', order.orderNumber);
        }
      } catch (err) {
        console.error('[reconcile] failed for order', stub.orderNumber, err.message);
      }
    }

    res.json({ checked, confirmed });
  } catch (err) {
    next(err);
  }
});

// Update order fulfilment status
router.patch('/orders/:id/status', async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const allowed = [
      'Order Placed',
      'Payment Verification Pending',
      'Confirmed',
      'Preparing',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ];
    if (!allowed.includes(orderStatus)) {
      return res.status(400).json({ error: `orderStatus must be one of: ${allowed.join(', ')}` });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { orderStatus } },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
