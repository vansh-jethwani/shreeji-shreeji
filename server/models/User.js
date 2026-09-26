const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    building: { type: String, trim: true },
    street: { type: String, trim: true },
    colony: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    latitude: { type: Number },
    longitude: { type: Number },
    formattedAddress: { type: String, trim: true },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    // Identity is the Mongo _id. phone is unique: one account per mobile number.
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
