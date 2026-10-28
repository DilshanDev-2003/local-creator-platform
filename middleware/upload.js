const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// The file extension comes from OUR map, never from the user's file name
const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, crypto.randomBytes(16).toString('hex') + ALLOWED[file.mimetype]),
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 MB, one file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new Error('INVALID_TYPE'));
    cb(null, true);
  },
});

// The browser's "Content-Type" can be faked, so we also check the real file bytes
function hasValidSignature(filePath) {
  const buf = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);

  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return isJpg || isPng || isWebp;
}

// Deletes a stored file. path.basename stops "../" tricks.
function removeFile(filename) {
  if (!filename) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(filename)), () => {});
}

// Wraps multer so upload problems become a friendly message (req.uploadError)
// instead of crashing the request.
function uploadImage(fieldName) {
  const single = upload.single(fieldName);
  return (req, res, next) => {
    single(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') req.uploadError = 'Image must be 2 MB or smaller.';
        else if (err.message === 'INVALID_TYPE') req.uploadError = 'Only JPG, PNG or WEBP images are allowed.';
        else req.uploadError = 'Upload failed. Please try again.';
        return next();
      }
      if (req.file && !hasValidSignature(req.file.path)) {
        removeFile(req.file.filename);
        req.file = undefined;
        req.uploadError = 'That file is not a valid image.';
      }
      next();
    });
  };
}

module.exports = { uploadImage, removeFile };