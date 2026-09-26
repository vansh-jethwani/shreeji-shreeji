// Site settings: editable key/value store the admin manages from /admin.
// Public settings (contact info, announcement) are served via GET /api/settings.
const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
