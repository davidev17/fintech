const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper: audit log
const auditLog = async (userId, action, req, details = {}) => {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, req.ip, req.get('user-agent'), JSON.stringify(details)]
    );
  } catch (e) {
    console.error('[AUDIT] Failed to write audit log:', e.message);
  }
};

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { name, email, password } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const accountNumber = `${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

    const result = await query(
      'INSERT INTO users (name, email, password_hash, balance, account_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, balance, account_number',
      [name, email, passwordHash, 1000.00, accountNumber]
    );

    const user = result.rows[0];
    await auditLog(user.id, 'USER_REGISTERED', req, { email });

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid credentials format' });
    }

    const { email, password } = req.body;

    const result = await query(
      'SELECT id, name, email, password_hash, role, balance, account_number FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      await new Promise(r => setTimeout(r, 200)); // timing attack prevention
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      await auditLog(user.id, 'LOGIN_FAILED', req, { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    await auditLog(user.id, 'LOGIN_SUCCESS', req);

    const { password_hash, ...userSafe } = user;
    res.json({ token, user: userSafe });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;