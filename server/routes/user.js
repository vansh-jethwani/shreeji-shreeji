const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  me,
  getProfile,
  updateProfile,
  listAddresses,
  addAddress,
  deleteAddress,
} = require('../controllers/userController');

router.get('/me', ...auth, me);
router.get('/profile', ...auth, getProfile);
router.patch('/profile', ...auth, updateProfile);
router.get('/addresses', ...auth, listAddresses);
router.post('/addresses', ...auth, addAddress);
router.delete('/addresses/:addressId', ...auth, deleteAddress);

module.exports = router;
