// Seed script: loads 24 EXAMPLE products (6 sections × 4 options).
// These are realistic placeholder products — the admin replaces them
// via the /admin dashboard or MongoDB. No code changes needed.
//
// IDEMPOTENT: safe to run multiple times. Each product is upserted by its
// stable key (name + section) — re-running never creates duplicates and
// never touches products the admin added or edited afterwards.
//
// Usage: cd server && npm run seed
// Requires: MONGODB_URI in .env

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const img = (slug) => `/images/products/${slug}.jpg`;

const products = [
  // ── Section 1 · Signature Sweets ──────────────────────────────
  { name: 'Soan Papdi', description: 'Delicate, melt-in-mouth cubes kissed with cardamom.', price: 250, section: 1, weight: '500g', image: img('soan-papdi') },
  { name: 'Rasgulla', description: 'Feather-light chenna dumplings soaked in saffron syrup.', price: 280, section: 1, weight: '1kg', image: img('rasgulla') },
  { name: 'Gulab Jamun', description: 'Slow-cooked khoya dumplings in rose-cardamom syrup.', price: 300, section: 1, weight: '1kg', image: img('gulab-jamun') },
  { name: 'Kaju Katli', description: 'Silken cashew fudge finished with edible silver leaf.', price: 550, section: 1, weight: '500g', image: img('kaju-katli') },

  // ── Section 2 · Classic Namkeens ──────────────────────────────
  { name: 'Bikaneri Bhujia', description: "The legendary crisp — moth flour, spices, Bikaner's pride.", price: 180, section: 2, weight: '400g', image: img('bikaneri-bhujia') },
  { name: 'Aloo Bhujia', description: 'Golden potato strands with a peppery kick.', price: 170, section: 2, weight: '400g', image: img('aloo-bhujia') },
  { name: 'Moong Dal', description: 'Crunchy roasted moong dal, lightly salted.', price: 190, section: 2, weight: '400g', image: img('moong-dal') },
  { name: 'Navratan Mixture', description: 'Nine-ingredient royal mix of nuts, lentils & spices.', price: 200, section: 2, weight: '400g', image: img('navratan-mixture') },

  // ── Section 3 · Savoury Snacks ────────────────────────────────
  { name: 'Masala Chips', description: 'Kettle-cooked potato chips dusted with chatpata masala.', price: 100, section: 3, weight: '150g', image: img('masala-chips') },
  { name: 'Banana Chips', description: 'Crisp Kerala-style banana chips, coconut-kissed.', price: 140, section: 3, weight: '200g', image: img('banana-chips') },
  { name: 'Masala Peanuts', description: 'Roasted peanuts in a fiery spice crust.', price: 160, section: 3, weight: '400g', image: img('masala-peanuts') },
  { name: 'Mini Chakli', description: 'Buttery rice-flour spirals, perfect with chai.', price: 175, section: 3, weight: '400g', image: img('mini-chakli') },

  // ── Section 4 · Premium Sweets ────────────────────────────────
  { name: 'Rasmalai', description: 'Cloud-soft chenna discs in saffron-pistachio milk.', price: 350, section: 4, weight: '1kg', image: img('rasmalai') },
  { name: 'Motichoor Laddu', description: 'Fine boondi pearls bound in desi ghee.', price: 320, section: 4, weight: '1kg', image: img('motichoor-laddu') },
  { name: 'Milk Cake', description: 'Caramelised milk fudge, slow-stirred for hours.', price: 380, section: 4, weight: '500g', image: img('milk-cake') },
  { name: 'Dry Fruit Barfi', description: 'Cashew-almond barfi studded with pistachios.', price: 520, section: 4, weight: '500g', image: img('dry-fruit-barfi') },

  // ── Section 5 · Gourmet Selection ─────────────────────────────
  { name: 'Honey Roasted Nuts', description: 'Cashews & almonds glazed in wild honey.', price: 450, section: 5, weight: '250g', image: img('honey-roasted-nuts') },
  { name: 'Peri Peri Makhana', description: 'Popped lotus seeds tossed in peri peri spice.', price: 220, section: 5, weight: '100g', image: img('peri-peri-makhana') },
  { name: 'Chocolate Dry Fruits', description: 'Belgian chocolate-coated almonds & raisins.', price: 480, section: 5, weight: '250g', image: img('chocolate-dry-fruits') },
  { name: 'Rose Pistachio Bites', description: 'Fragrant rose-white chocolate bites with pistachio.', price: 420, section: 5, weight: '250g', image: img('rose-pistachio-bites') },

  // ── Section 6 · Hamper Atelier ────────────────────────────────
  { name: 'Signature Gift Box', description: 'Keepsake rigid box with gold-foil detailing.', price: 199, section: 6, weight: '1 pc', image: img('luxury-gift-box') },
  { name: 'Greeting Card Set', description: 'Set of 4 letterpress greeting cards.', price: 99, section: 6, weight: 'Set of 4', image: img('greeting-card-set') },
  { name: 'Trail Mix', description: 'Energy mix of nuts, seeds & berries.', price: 550, section: 6, weight: '500g', image: img('trail-mix') },
  { name: 'Roasted Almonds', description: 'California almonds, slow-roasted with sea salt.', price: 600, section: 6, weight: '500g', image: img('roasted-almonds') },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing in .env — cannot seed.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  // Idempotent upsert: match on the stable key (name + section).
  // Only inserts missing products — existing docs (including anything the
  // admin added or edited) are left untouched, so re-running is always safe.
  const ops = products.map((p) => ({
    updateOne: {
      filter: { name: p.name, section: p.section },
      update: { $setOnInsert: { ...p, quantity: 1, available: true } },
      upsert: true,
    },
  }));
  const result = await Product.bulkWrite(ops);
  const inserted = result.upsertedCount || 0;
  console.log(
    `Seed complete: ${inserted} new products inserted, ` +
      `${products.length - inserted} already present (left untouched).`
  );

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
