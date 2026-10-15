const router = require('express').Router();
const Painting = require('../models/Painting');
const Category = require('../models/Category');
const { wrap, str, escapeRegex } = require('../utils');

// GET /api/paintings?search=sunset&medium=Oil on Canvas&category=nature&sort=price_asc&featured=1&available=1&limit=12&page=1
// sort: newest (default) | oldest | price_asc | price_desc | title
const SORTS = {
  newest: { createdAt: -1 }, oldest: { createdAt: 1 },
  price_asc: { price: 1, createdAt: -1 }, price_desc: { price: -1, createdAt: -1 },
  title: { title: 1 }
};
router.get('/paintings', wrap(async (req, res) => {
  const q = req.query, f = {};
  if (q.featured === '1') f.featured = true;
  if (q.available === '1') f.status = 'available';
  if (q.category) {
    const c = await Category.findOne({ slug: str(q.category, 60) }).select('_id');
    if (!c) return res.json({ items: [], total: 0, page: 1, pages: 0 });
    f.category = c._id;
  }
  if (q.medium) f.medium = new RegExp('^' + escapeRegex(str(q.medium, 60)) + '$', 'i');   // case-insensitive exact match
  const term = str(q.search, 80);
  if (term) {
    const rx = new RegExp(escapeRegex(term), 'i');
    f.$or = [{ title: rx }, { description: rx }, { medium: rx }];
  }
  const sort = SORTS[q.sort] || SORTS.newest;
  const limit = Math.min(100, Math.max(1, parseInt(q.limit) || 24));
  const page = Math.max(1, parseInt(q.page) || 1);
  const [items, total] = await Promise.all([
    Painting.find(f).collation({ locale: 'en' }).sort(sort).skip((page - 1) * limit).limit(limit).populate('category', 'name slug'),
    Painting.countDocuments(f)
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

// Categories that have at least one painting, in the order the admin created them
router.get('/categories', wrap(async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort({ createdAt: 1 }),
    Painting.aggregate([{ $match: { category: { $ne: null } } }, { $group: { _id: '$category', n: { $sum: 1 } } }])
  ]);
  const m = new Map(counts.map(c => [String(c._id), c.n]));
  res.json({ items: cats.map(c => ({ _id: c._id, name: c.name, slug: c.slug, count: m.get(String(c._id)) || 0 })).filter(c => c.count > 0) });
}));

// Distinct mediums (Oil on Canvas, Acrylic on Canvas ...) used by the paintings, for the "All mediums" dropdown
router.get('/mediums', wrap(async (req, res) => {
  const rows = await Painting.aggregate([
    { $match: { medium: { $nin: ['', null] } } },
    { $group: { _id: { $toLower: '$medium' }, name: { $first: '$medium' }, count: { $sum: 1 } } },
    { $sort: { name: 1 } }
  ]);
  res.json({ items: rows.map(r => ({ name: r.name, count: r.count })) });
}));

// Generic WhatsApp link for "Enquire Now" buttons that aren't about one painting
router.get('/config', (req, res) => {
  const num = String(process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const text = encodeURIComponent('Hello! I would like to know more about your paintings.');
  res.json({ whatsappUrl: num ? `https://wa.me/${num}?text=${text}` : '' });
});

module.exports = router;
