const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
module.exports = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.sg_admin;
    if (!token) return res.status(401).json({ error: 'Not signed in' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(id).select('email');
    if (!admin) return res.status(401).json({ error: 'Not signed in' });
    req.admin = admin;
    next();
  } catch { res.status(401).json({ error: 'Not signed in' }); }
};
