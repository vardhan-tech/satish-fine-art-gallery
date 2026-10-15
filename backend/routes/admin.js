const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Painting = require('../models/Painting');
const Category = require('../models/Category');
const requireAdmin = require('../middleware/auth');
const upload = require('../middleware/upload');
const cloud = require('../config/cloudinary');
const { httpError, wrap, str, escapeRegex, isId, slugify, rand } = require('../utils');

const DUMMY = bcrypt.hashSync('not-a-real-password', 10); // keeps timing similar for unknown emails

router.post('/login', wrap(async (req, res) => {
  const email = str(req.body.email, 120).toLowerCase(), password = String(req.body.password ?? '');
  const admin = await Admin.findOne({ email });
  const ok = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY);
  if (!admin || !ok) throw httpError(401, 'Incorrect email or password');
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('sg_admin', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 7 * 864e5 });
  res.json({ ok: true });
}));
router.post('/logout', (req, res) => { res.clearCookie('sg_admin'); res.json({ ok: true }); });

router.use(requireAdmin); // everything below needs a signed-in admin
router.param('id', (req, res, next, v) => (isId(v) ? next() : next(httpError(404, 'Not found'))));

async function parsePainting(b, creating) {
  const o = {};
  if (b.title !== undefined) o.title = str(b.title, 120);
  if (b.description !== undefined) o.description = str(b.description, 3000);
  if (b.size !== undefined) o.size = str(b.size, 40);
  if (b.medium !== undefined) o.medium = str(b.medium, 60);
  if (b.price !== undefined && b.price !== '') {
    const n = Number(b.price);
    if (!Number.isFinite(n) || n < 0) throw httpError(400, 'Price must be a positive number');
    o.price = n;
  }
  if (b.status !== undefined) {
    if (!['available', 'sold'].includes(b.status)) throw httpError(400, 'Invalid status');
    o.status = b.status;
  }
  if (b.category !== undefined) {
    if (b.category === '' || b.category === 'null') o.category = null;
    else if (isId(b.category) && await Category.exists({ _id: b.category })) o.category = b.category;
    else throw httpError(400, 'That category does not exist');
  }
  if (b.featured !== undefined) o.featured = b.featured === true || b.featured === 'true' || b.featured === 'on';
  if (creating && (!o.title || o.price === undefined)) throw httpError(400, 'Title and price are required');
  return o;
}

router.get('/paintings', wrap(async (req, res) => {
  const f = req.query.q ? { title: new RegExp(escapeRegex(str(req.query.q, 60)), 'i') } : {};
  res.json({ items: await Painting.find(f).sort({ createdAt: -1 }).populate('category', 'name slug') });
}));

router.post('/paintings', upload.array('images', 6), wrap(async (req, res) => {
  const data = await parsePainting(req.body, true);
  const images = await Promise.all((req.files || []).map(f => cloud.upload(f.buffer)));
  try { res.status(201).json(await Painting.create({ ...data, images })); }
  catch (e) { await Promise.all(images.map(i => cloud.destroy(i.publicId))); throw e; }
}));

router.put('/paintings/:id', upload.array('images', 6), wrap(async (req, res) => {
  const p = await Painting.findById(req.params.id);
  if (!p) throw httpError(404, 'Painting not found');
  Object.assign(p, await parsePainting(req.body, false));
  let remove = [];
  try { remove = JSON.parse(req.body.removeImages || '[]'); } catch {}
  remove = Array.isArray(remove) ? remove.map(String) : [];
  const gone = p.images.filter(i => remove.includes(i.publicId));
  p.images = p.images.filter(i => !remove.includes(i.publicId));
  const added = await Promise.all((req.files || []).map(f => cloud.upload(f.buffer)));
  if (p.images.length + added.length > 6) {
    await Promise.all(added.map(i => cloud.destroy(i.publicId)));
    throw httpError(400, 'A painting can have up to 6 images');
  }
  p.images.push(...added);
  await p.save();
  await Promise.all(gone.map(i => cloud.destroy(i.publicId)));
  res.json(p);
}));

router.delete('/paintings/:id', wrap(async (req, res) => {
  const p = await Painting.findById(req.params.id);
  if (!p) throw httpError(404, 'Painting not found');
  await Promise.all(p.images.map(i => cloud.destroy(i.publicId))); // also removes the images from Cloudinary
  await p.deleteOne();
  res.json({ ok: true });
}));

/* ---------- Categories ---------- */
const catSlug = name => { const s = slugify(name); return s === 'painting' && !/painting/i.test(name) ? 'cat-' + rand(3) : s; }; // non-English names get a safe slug

router.get('/categories', wrap(async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort({ createdAt: 1 }),
    Painting.aggregate([{ $match: { category: { $ne: null } } }, { $group: { _id: '$category', n: { $sum: 1 } } }])
  ]);
  const m = new Map(counts.map(c => [String(c._id), c.n]));
  res.json({ items: cats.map(c => ({ _id: c._id, name: c.name, slug: c.slug, count: m.get(String(c._id)) || 0 })) });
}));

router.post('/categories', wrap(async (req, res) => {
  const name = str(req.body.name, 40);
  if (!name) throw httpError(400, 'Enter a category name');
  const slug = catSlug(name);
  if (await Category.exists({ slug })) throw httpError(409, 'That category already exists');
  res.status(201).json(await Category.create({ name, slug }));
}));

router.put('/categories/:id', wrap(async (req, res) => {
  const name = str(req.body.name, 40);
  if (!name) throw httpError(400, 'Enter a category name');
  const c = await Category.findById(req.params.id);
  if (!c) throw httpError(404, 'Category not found');
  const slug = catSlug(name);
  if (await Category.exists({ slug, _id: { $ne: c._id } })) throw httpError(409, 'That category already exists');
  c.name = name; c.slug = slug;
  await c.save();
  res.json(c);
}));

// Deleting a category keeps its paintings; they just become uncategorised
router.delete('/categories/:id', wrap(async (req, res) => {
  const c = await Category.findById(req.params.id);
  if (!c) throw httpError(404, 'Category not found');
  const r = await Painting.updateMany({ category: c._id }, { $set: { category: null } });
  await c.deleteOne();
  res.json({ ok: true, unassigned: r.modifiedCount });
}));

module.exports = router;
