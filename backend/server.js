require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me') {
  console.error('Set a strong JWT_SECRET in your .env file.'); process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));   // your public pages can use any fonts/CDNs
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Public API may be called from another address (e.g. Live Server) if CORS_ORIGIN is set
const origins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
if (origins.length) app.use('/api', (req, res, next) => (req.path.startsWith('/admin') ? next() : cors({ origin: origins })(req, res, next)));

const limiter = (min, max, error) => rateLimit({ windowMs: min * 60e3, max, standardHeaders: true, legacyHeaders: false, message: { error } });
app.use('/api', limiter(15, 500, 'Too many requests, please slow down'));
app.use('/api/admin/login', limiter(15, 10, 'Too many login attempts. Try again in a few minutes.'));

app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Admin panel gets a strict Content-Security-Policy and is hidden from search engines
app.use('/admin',
  (req, res, next) => { res.set('X-Robots-Tag', 'noindex, nofollow'); next(); },
  helmet.contentSecurityPolicy({ useDefaults: false, directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ['https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], baseUri: ["'self'"], frameAncestors: ["'none'"] } }),
  express.static(path.join(__dirname, '../Frontend/admin')));

app.use(express.static(path.join(__dirname, '../Frontend/public')));   // put your frontend files in /public

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' || err.name === 'MulterError' || err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error(err);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be under 8 MB' : status >= 500 ? 'Something went wrong. Please try again.' : err.message;
  res.status(status).json({ error: msg });
});

connectDB().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Running on http://localhost:${port}   Admin panel: http://localhost:${port}/admin/`));
}).catch(e => { console.error(e.message); process.exit(1); });
