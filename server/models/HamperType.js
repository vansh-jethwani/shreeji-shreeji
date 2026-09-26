// Hamper types: the "choose your hamper" catalogue.
// - customizable: true  -> customer picks one product per section (builder),
//   but pays the type's FIXED price (never the sum of item prices).
// - customizable: false -> premade hamper with fixed contents, no builder,
//   straight to checkout.
// Everything (name, price, image, sections, fixed items) is admin-editable.
const mongoose = require('mongoose');

const fixedItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    weight: { type: String, default: '', trim: true },
    qty: { type: Number, default: 1, min: 1, max: 99 },
  },
  { _id: false }
);

// Per-section customization for customizable types. sections[i] is builder
// section i+1. productIds empty/missing -> that section offers ALL available
// products of global section i+1 (the old behaviour). name empty -> the
// global settings section name is used.
const hamperSectionSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  { _id: false }
);

const hamperTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    price: { type: Number, required: true, min: 0 }, // fixed hamper price (INR)
    image: { type: String, default: '' },
    description: { type: String, default: '', trim: true },
    customizable: { type: Boolean, default: true },
    // How many sections the customer picks from (customizable types only).
    // Falls back to the settings hamperSectionCount when out of range.
    // Kept in sync with sections.length by the admin routes.
    sectionCount: { type: Number, default: 6, min: 1, max: 20 },
    // Per-section names + custom option lists (customizable types only).
    sections: { type: [hamperSectionSchema], default: [] },
    fixedItems: { type: [fixedItemSchema], default: [] }, // premade types only
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

hamperTypeSchema.index({ sortOrder: 1, name: 1 });

module.exports = mongoose.model('HamperType', hamperTypeSchema);
