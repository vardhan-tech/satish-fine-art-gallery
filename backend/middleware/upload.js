const multer = require('multer');
module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => /^image\/(jpeg|png|webp)$/.test(file.mimetype)
    ? cb(null, true)
    : cb(Object.assign(new Error('Only JPG, PNG or WebP images are allowed'), { status: 400 }))
});
