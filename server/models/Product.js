const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    image: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    // Upper bound is dynamic (admin sets hamperSectionCount in Site Settings);
    // enforced in routes/admin.js at request time, not here.
    section: { type: Number, required: true, min: 1, index: true },
    weight: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1, min: 0 },
    available: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

productSchema.index({ section: 1, available: 1 });

module.exports = mongoose.model('Product', productSchema);
