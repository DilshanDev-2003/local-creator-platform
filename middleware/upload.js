const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const fileRepository = require('../repositories/fileRepository');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// The file stays in memory until we have checked it
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }, // 2 MB, one file
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) return cb(new Error('INVALID_TYPE'));
    cb(null, true);
  },
});

// The type comes from the REAL file bytes, never from the name or the browser's claim
function detectType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { mime: 'image/webp', ext: '.webp' };
  }
  return null;
}

// Deletes a stored image from the database (and from disk for old demo files).
// path.basename stops "../" tricks. Always await this.
async function removeFile(filename) {
  if (!filename) return;
  const safe = path.basename(filename);
  try {
    await fileRepository.remove(safe);
  } catch (err) {
    console.error(err);
  }
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, safe));
  } catch (err) {
    // not on disk: nothing to do
  }
}

// Wraps multer so problems become a friendly message (req.uploadError)
function uploadImage(fieldName) {
  const single = upload.single(fieldName);
  return (req, res, next) => {
    single(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') req.uploadError = 'Image must be 2 MB or smaller.';
        else if (err.message === 'INVALID_TYPE') req.uploadError = 'Only JPG, PNG or WEBP images are allowed.';
        else req.uploadError = 'Upload failed. Please try again.';
        return next();
      }
      if (!req.file) return next();

      const type = detectType(req.file.buffer);
      if (!type) {
        req.file = undefined;
        req.uploadError = 'That file is not a valid image.';
        return next();
      }

      const filename = crypto.randomBytes(16).toString('hex') + type.ext;
      try {
        await fileRepository.save(filename, type.mime, req.file.buffer);
        req.file.filename = filename; // controllers use req.file.filename, as before
      } catch (saveErr) {
        console.error(saveErr);
        req.file = undefined;
        req.uploadError = 'Upload failed. Please try again.';
      }
      next();
    });
  };
}

module.exports = { uploadImage, removeFile };