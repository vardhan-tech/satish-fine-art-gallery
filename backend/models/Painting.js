const mongoose = require('mongoose');

const s = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 3000, default: '' },
  size: { type: String, trim: true, maxlength: 40, default: '' },     // size / ratio, e.g. 24" x 36"
  medium: { type: String, trim: true, maxlength: 60, default: '' },   // e.g. Oil on Canvas
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  price: { type: Number, required: true, min: 0 },                    // in rupees
  images: [{ url: String, publicId: String, _id: false }],            // first image is the cover
  featured: { type: Boolean, default: false },                        // show in "Popular Paintings"
  status: { type: String, enum: ['available', 'sold'], default: 'available', index: true }
}, { timestamps: true });

// Ready-made WhatsApp link with the painting details pre-filled in the message
s.virtual('whatsappUrl').get(function () {
  const num = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  if (!num) return '';
  const msg = `Hello! I'm interested in the painting "${this.title}"${this.size ? ` (${this.size})` : ''} priced at ₹ ${Number(this.price).toLocaleString('en-IN')}. Is it available?`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
});
s.set('toJSON', { virtuals: true, versionKey: false, transform: (_, r) => { delete r.id; return r; } });

module.exports = mongoose.model('Painting', s);
