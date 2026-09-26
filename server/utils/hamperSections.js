// Effective per-section options for a HamperType.
//
// Semantics (shared by the public catalogue and order validation):
// - sections[i] corresponds to builder section i+1.
// - If sections[i].productIds is non-empty -> that section offers exactly
//   those products, but only ones that still exist and are available:true.
//   (A custom product may come from any global product section.)
// - If sections[i].productIds is empty/missing -> that section offers all
//   available products whose global `section` equals i+1 (the old behaviour).
// - If sections[i].name is empty/missing -> the global settings section name
//   is used (then "Section N" as a last resort).
// - If the type has no sections entries at all, they are synthesized from
//   sectionCount (all-empty -> all products per section).
const Product = require('../models/Product');

const PRODUCT_FIELDS = '_id name price image weight section';

async function getEffectiveSectionCount(type) {
  const n = Number(type && type.sectionCount);
  if (Number.isInteger(n) && n >= 1 && n <= 20) return n;
  const { getHamperConfig } = require('./hamper');
  const cfg = await getHamperConfig();
  return cfg.count;
}

// Normalize the raw stored entries to exactly sectionCount
// [{ name, productIds }] entries.
function getTypeSectionEntries(type, sectionCount) {
  const raw = type && Array.isArray(type.sections) ? type.sections : [];
  const out = [];
  for (let i = 0; i < sectionCount; i++) {
    const entry = raw[i];
    out.push({
      name: entry && typeof entry.name === 'string' ? entry.name.trim() : '',
      productIds:
        entry && Array.isArray(entry.productIds)
          ? entry.productIds.map(String).filter(Boolean)
          : [],
    });
  }
  return out;
}

function sortByName(products) {
  return [...products].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

/**
 * Returns the effective builder sections for a hamper type:
 * [ { name, products: [ { _id, name, price, image, weight, section } ] } ]
 * products are lean plain objects sorted by name.
 */
async function getEffectiveSections(type) {
  const sectionCount = await getEffectiveSectionCount(type);
  const entries = getTypeSectionEntries(type, sectionCount);

  // Custom option lists: fetch those exact products (available only).
  const customIds = [];
  for (const e of entries) {
    if (e.productIds.length > 0) customIds.push(...e.productIds);
  }
  let customById = new Map();
  if (customIds.length > 0) {
    const docs = await Product.find({ _id: { $in: customIds }, available: true })
      .select(PRODUCT_FIELDS)
      .lean();
    customById = new Map(docs.map((p) => [String(p._id), p]));
  }

  // Fallback sections: all available products of the matching global section.
  const fallbackNumbers = entries
    .map((e, i) => (e.productIds.length > 0 ? null : i + 1))
    .filter((n) => n !== null);
  const byGlobalSection = new Map();
  if (fallbackNumbers.length > 0) {
    const docs = await Product.find({ section: { $in: fallbackNumbers }, available: true })
      .select(PRODUCT_FIELDS)
      .lean();
    for (const p of docs) {
      const k = Number(p.section);
      if (!byGlobalSection.has(k)) byGlobalSection.set(k, []);
      byGlobalSection.get(k).push(p);
    }
  }

  // Section display names: custom name, else the global settings name.
  const { getHamperConfig } = require('./hamper');
  const cfg = await getHamperConfig();

  return entries.map((e, i) => {
    let products;
    if (e.productIds.length > 0) {
      products = e.productIds.map((id) => customById.get(String(id))).filter(Boolean);
    } else {
      products = byGlobalSection.get(i + 1) || [];
    }
    return {
      name: e.name || cfg.names[i] || `Section ${i + 1}`,
      products: sortByName(products),
    };
  });
}

/**
 * Allowed product-id strings per builder section, for order validation.
 * Returns an array of arrays aligned with section index (0-based).
 */
async function getAllowedIdsPerSection(type) {
  const effective = await getEffectiveSections(type);
  return effective.map((s) => s.products.map((p) => String(p._id)));
}

module.exports = {
  getEffectiveSectionCount,
  getTypeSectionEntries,
  getEffectiveSections,
  getAllowedIdsPerSection,
};
