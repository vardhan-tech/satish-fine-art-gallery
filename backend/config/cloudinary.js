const { v2: cloudinary } = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});
const folder = process.env.CLOUDINARY_FOLDER || 'satish-gallery';
const pick = r => ({ url: r.secure_url, publicId: r.public_id });

// Upload an in-memory buffer (admin uploads)
const upload = buf => new Promise((resolve, reject) =>
  cloudinary.uploader.upload_stream({ folder, resource_type: 'image' }, (e, r) => (e ? reject(e) : resolve(pick(r)))).end(buf));
// Upload a file from disk (seed script)
const uploadPath = p => cloudinary.uploader.upload(p, { folder }).then(pick);
const destroy = id => cloudinary.uploader.destroy(id).catch(() => {});

module.exports = { upload, uploadPath, destroy };
