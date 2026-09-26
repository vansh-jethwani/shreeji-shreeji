const Product = require('../models/Product');
const { getHamperConfig } = require('../utils/hamper');

// GET /api/products - list all available products, grouped-ready
async function listProducts(req, res, next) {
  try {
    const { available } = req.query;
    const filter = {};
    if (available === 'true') filter.available = true;
    if (available === 'false') filter.available = false;

    const products = await Product.find(filter).sort({ section: 1, name: 1 }).lean();
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/sections - products grouped by section 1..N (dynamic)
async function listBySection(req, res, next) {
  try {
    const { count, names } = await getHamperConfig();
    const products = await Product.find({ available: true }).sort({ section: 1, name: 1 }).lean();
    const sections = {};
    for (let i = 1; i <= count; i++) sections[i] = [];
    for (const p of products) {
      if (sections[p.section]) sections[p.section].push(p);
    }
    res.json({ sections, sectionCount: count, sectionNames: names });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, listBySection };
