// Creates the admin account (or resets its password if it already exists).
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase(), password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 10) throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 10 characters in .env');
  await connectDB();
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await Admin.findOne({ email });
  if (existing) { existing.passwordHash = passwordHash; await existing.save(); console.log('Admin password updated for', email); }
  else { await Admin.create({ email, passwordHash }); console.log('Admin created:', email); }
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
