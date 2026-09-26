// Public hamper-type catalogue. No auth needed — the "choose your hamper"
// page reads from here.
const express = require('express');
const mongoose = require('mongoose');
const HamperType = require('../models/HamperType');
const { getEffectiveSections } = require('../utils/hamperSections');

const router = express.Router();

// Attach the effective per-section options to a lean hamper-type object.
// sections: [ { name, products: [ { _id, name, price, image, weight, section } ] } ]
// (products sorted by name; custom lists filtered to available products;
// empty lists fall back to all available products of the global section).
async function withSections(type) {
  const sections = await getEffectiveSections(type);
  return { ...type, sections };
}

// GET /api/hamper-types — active types only, admin-defined order
router.get('/', async (req, res, next) => {
  try {
    const hamperTypes = await HamperType.find({ active: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const out = await Promise.all(hamperTypes.map(withSections));
    res.json({ hamperTypes: out });
  } catch (err) {
    next(err);
  }
});

// GET /api/hamper-types/:id — a single active type (404 when missing/inactive)
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Hamper not found.' });
    }
    const hamperType = await HamperType.findOne({ _id: id, active: true }).lean();
    if (!hamperType) {
      return res.status(404).json({ error: 'Hamper not found.' });
    }
    res.json({ hamperType: await withSections(hamperType) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
