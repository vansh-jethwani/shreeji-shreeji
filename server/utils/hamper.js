// Hamper builder configuration — fully admin-editable via Site Settings.
// The admin changes `hamperSectionCount` / `hamperSectionNames` in
// PUT /api/admin/settings and the builder + order validation follow automatically.
const Setting = require('../models/Setting');

const DEFAULT_SECTION_COUNT = 6;
const DEFAULT_SECTION_NAMES = [
  'Something Sweet',
  'Melt-in-Mouth',
  'Classic Favourites',
  'Crunchy & Savoury',
  'Chocolate & More',
  'Finishing Touch',
];

function normalizeCount(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_SECTION_COUNT;
  return n;
}

function normalizeNames(raw, count) {
  const names = Array.isArray(raw) ? raw.filter((s) => typeof s === 'string' && s.trim()) : [];
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(names[i] && names[i].trim() ? names[i].trim() : `Section ${i + 1}`);
  }
  return out;
}

// Reads the hamper config from settings at request time (never cached at
// module load, so admin changes take effect immediately).
async function getHamperConfig() {
  let count = DEFAULT_SECTION_COUNT;
  let names = DEFAULT_SECTION_NAMES;
  try {
    const docs = await Setting.find({
      key: { $in: ['hamperSectionCount', 'hamperSectionNames'] },
    })
      .lean();
    for (const d of docs) {
      if (d.key === 'hamperSectionCount') count = normalizeCount(d.value);
      if (d.key === 'hamperSectionNames') names = d.value;
    }
  } catch (err) {
    // Fall through to defaults — validation must never crash the server.
  }
  count = normalizeCount(count);
  return { count, names: normalizeNames(names, count) };
}

module.exports = { getHamperConfig, DEFAULT_SECTION_COUNT, DEFAULT_SECTION_NAMES };
