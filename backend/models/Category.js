const mongoose = require('mongoose');
const s = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 40 },
  slug: { type: String, unique: true, index: true }
}, { timestamps: true });
s.set('toJSON', { versionKey: false });
module.exports = mongoose.model('Category', s);
