// Site settings routes.
// GET /api/settings is PUBLIC (contact info, announcement, etc.).
// PUT /api/admin/settings is admin-only (upserts each key).
const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// Public: returns { key: value } object of all settings.
router.get('/', async (req, res, next) => {
  try {
    const docs = await Setting.find({}).lean();
    const out = {};
    for (const d of docs) out[d.key] = d.value;
    res.json(out);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
