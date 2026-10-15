const crypto = require('crypto');
const httpError = (status, message) => Object.assign(new Error(message), { status });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const slugify = s => str(s, 120).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-') || 'painting';
const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = v => /^[a-f\d]{24}$/i.test(String(v));
const rand = n => crypto.randomBytes(n).toString('hex');
module.exports = { httpError, wrap, str, slugify, escapeRegex, isId, rand };
