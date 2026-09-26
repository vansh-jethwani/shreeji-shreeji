// Self-contained JWT authentication middleware. NO external auth system.
// The frontend collects name + mobile number (no OTP) and calls POST /api/auth/login,
// which returns a JWT. The client sends it as: Authorization: Bearer <jwt>
//
// Verifies the JWT server-side and loads the user from MongoDB.
// NEVER trust a userId supplied by the frontend - the verified _id is attached
// to req.auth = { uid, phone } and used everywhere instead.
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function attachUser(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res
      .status(401)
      .json({ error: 'Sign-in is not configured on the server. Please contact support.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(match[1], secret);
  } catch (e) {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }

  if (!decoded || !decoded.sub) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  try {
    const user = await User.findById(decoded.sub).lean();
    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please sign in again.' });
    }
    req.auth = { uid: String(user._id), phone: user.phone, userId: user._id };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }
}

// Use as: router.get('/x', ...auth, handler)
const auth = [attachUser];

module.exports = { auth, attachUser };
