const User = require('../models/User');
const { isAdminPhone } = require('../middleware/isAdmin');

// GET /api/user/me -> { user, isAdmin }
async function me(req, res, next) {
  try {
    const user = await User.findById(req.auth.uid).lean();
    res.json({ user, isAdmin: isAdminPhone(req.auth.phone) });
  } catch (err) {
    next(err);
  }
}

// GET /api/user/profile
async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.auth.uid).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/user/profile
// Updates name/email. Phone is the account identity (set at sign-in) and cannot
// be changed here - signing in with a different number creates that account.
async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim().slice(0, 80);
    if (email !== undefined) update.email = String(email).trim().toLowerCase().slice(0, 120);

    const user = await User.findByIdAndUpdate(req.auth.uid, { $set: update }, { new: true, runValidators: true }).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

// GET /api/user/addresses
async function listAddresses(req, res, next) {
  try {
    const user = await User.findById(req.auth.uid).lean();
    res.json({ addresses: user ? user.addresses : [] });
  } catch (err) {
    next(err);
  }
}

// POST /api/user/addresses
async function addAddress(req, res, next) {
  try {
    const { building, street, colony, area, city, state, pincode, latitude, longitude, formattedAddress } =
      req.body || {};
    if (!city || !state || !pincode) {
      return res.status(400).json({ error: 'City, state and pincode are required.' });
    }
    const user = await User.findByIdAndUpdate(
      req.auth.uid,
      {
        $push: {
          addresses: {
            building, street, colony, area, city, state, pincode, latitude, longitude, formattedAddress,
          },
        },
      },
      { new: true, runValidators: true }
    ).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.status(201).json({ addresses: user.addresses });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/user/addresses/:addressId
async function deleteAddress(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.auth.uid,
      { $pull: { addresses: { _id: req.params.addressId } } },
      { new: true }
    ).lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ addresses: user.addresses });
  } catch (err) {
    next(err);
  }
}

module.exports = { me, getProfile, updateProfile, listAddresses, addAddress, deleteAddress };
