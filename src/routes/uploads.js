const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Multer config — disk storage with safe filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Accepted: JPEG, PNG, WEBP, PDF'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter
});

// POST /api/uploads — upload a document
router.post('/', upload.single('document'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const result = await query(
      'INSERT INTO uploads (user_id, filename, original_name, mimetype, size, path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, filename, original_name, mimetype, size, created_at',
      [
        req.user.id,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.path
      ]
    );

    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'FILE_UPLOADED', req.ip, JSON.stringify({ file: req.file.originalname, size: req.file.size })]
    );

    res.status(201).json({
      message: 'Document uploaded successfully',
      upload: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/uploads — list user uploads
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, filename, original_name, mimetype, size, created_at FROM uploads WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ uploads: result.rows });
  } catch (err) {
    next(err);
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size: 5MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;