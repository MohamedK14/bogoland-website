const express = require('express');
const multer = require('multer');
const cloudinary = require('../cloudinary');
const { requireAdmin } = require('../authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// POST /api/upload — admin only. Send as multipart/form-data with field
// name "image". Returns { url } — the Cloudinary URL to store on the product.
router.post('/', requireAdmin, upload.single('image'), (req, res) => {
  if(!req.file){
    return res.status(400).json({ error: 'No image file provided (field name must be "image")' });
  }

  const stream = cloudinary.uploader.upload_stream(
    { folder: 'bogoland' },
    (err, result) => {
      if(err){
        console.error(err);
        return res.status(500).json({ error: 'Cloudinary upload failed' });
      }
      res.json({ url: result.secure_url });
    }
  );
  stream.end(req.file.buffer);
});

module.exports = router;
