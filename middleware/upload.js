const multer = require('multer');
const path = require('path');
const allowed = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
function validateFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  return allowed.has(ext) && allowed.get(ext) === file.mimetype;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!validateFile(file))
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'paymentSlip'));
    file.safeExtension = path.extname(file.originalname).toLowerCase().slice(1);
    cb(null, true);
  },
});
module.exports = { upload, validateFile };
