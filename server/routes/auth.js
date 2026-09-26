// Self-contained auth routes. NO external auth system, NO OTP.
// Sign-in is simply: mobile number (+ optional name). First sign-in auto-creates
// the user in MongoDB; the server returns a JWT the client stores and sends as
// Authorization: Bearer <jwt> on protected requests.
const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isAdminPhone } = require('../middleware/isAdmin');

const router = express.Router();

// Abuse protection on the public login endpoint: ~10 sign-ins per 15 min per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please try again later.' },
});

/**
 * Normalize an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts: 9876543210, 919876543210, +919876543210 (with spaces/dashes).
 * Returns null when invalid.
 */
function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  let local = null;
  if (/^[6-9]\d{9}$/.test(digits)) {
    local = digits;
  } else if (/^91[6-9]\d{9}$/.test(digits)) {
    local = digits.slice(2);
  }
  return local ? `+91${local}` : null;
}

// POST /api/auth/login  Body: { phone, name? }
// -> { token, user: { id, name, phone }, isAdmin, isNewUser }
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res
        .status(500)
        .json({ error: 'Sign-in is not configured on the server. Please contact support.' });
    }

    const phone = normalizePhone(req.body && req.body.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const name =
      req.body && req.body.name !== undefined
        ? String(req.body.name).trim().slice(0, 80)
        : '';

    let user = await User.findOne({ phone });
    const isNewUser = !user;

    if (!user) {
      user = await User.create({ phone, name: name || undefined, addresses: [] });
    } else if (name && name !== user.name) {
      // Keep the saved name fresh when the customer provides one at sign-in.
      user.name = name;
      await user.save();
    }

    const token = jwt.sign(
      { sub: String(user._id), phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name || '', phone: user.phone },
      isAdmin: isAdminPhone(user.phone),
      isNewUser,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
