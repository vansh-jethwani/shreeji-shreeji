// Admin authorization middleware.
// Admins are defined by ADMIN_PHONE_NUMBERS (comma-separated E.164 phone
// numbers, e.g. +919829012345,+919876543210). The admin signs in with one of
// these mobile numbers (name + mobile sign-in, no OTP, no external auth).
// Must run AFTER auth middleware so req.auth exists.
// Never rely on frontend-only admin checks.

function getAdminPhones() {
  return (process.env.ADMIN_PHONE_NUMBERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdminPhone(phone) {
  if (!phone) return false;
  return getAdminPhones().includes(String(phone).trim());
}

function isAdmin(req, res, next) {
  if (!req.auth || !isAdminPhone(req.auth.phone)) {
    return res.status(403).json({ error: 'Forbidden. Admin access required.' });
  }
  req.auth.isAdmin = true;
  next();
}

module.exports = { isAdmin, isAdminPhone, getAdminPhones };
