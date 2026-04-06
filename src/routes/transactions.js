const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/transactions - List user transactions
router.get('/', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const userId = req.user.id;

    const result = await query(`
      SELECT 
        t.id,
        t.amount,
        t.type,
        t.status,
        t.description,
        t.created_at,
        sender.name AS sender_name,
        sender.account_number AS sender_account,
        receiver.name AS receiver_name,
        receiver.account_number AS receiver_account,
        CASE WHEN t.sender_id = $1 THEN 'debit' ELSE 'credit' END AS direction
      FROM transactions t
      LEFT JOIN users sender ON t.sender_id = sender.id
      LEFT JOIN users receiver ON t.receiver_id = receiver.id
      WHERE t.sender_id = $1 OR t.receiver_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, parseInt(limit), parseInt(offset)]);

    const countResult = await query(
      'SELECT COUNT(*) FROM transactions WHERE sender_id = $1 OR receiver_id = $1',
      [userId]
    );

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions/transfer
router.post('/transfer', [
  body('toAccountNumber').trim().notEmpty(),
  body('amount').isFloat({ min: 0.01, max: 50000 }),
  body('description').optional().trim().isLength({ max: 200 }),
], async (req, res, next) => {
  const client = await pool.connect();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { toAccountNumber, amount, description } = req.body;
    const senderId = req.user.id;

    if (toAccountNumber === req.user.account_number) {
      return res.status(400).json({ error: 'Cannot transfer to your own account' });
    }

    await client.query('BEGIN');

    // Lock sender row
    const senderResult = await client.query(
      'SELECT id, balance, name FROM users WHERE id = $1 FOR UPDATE',
      [senderId]
    );
    const sender = senderResult.rows[0];

    if (parseFloat(sender.balance) < parseFloat(amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Lock receiver row
    const receiverResult = await client.query(
      'SELECT id, name, account_number FROM users WHERE account_number = $1 FOR UPDATE',
      [toAccountNumber]
    );

    if (receiverResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Destination account not found' });
    }

    const receiver = receiverResult.rows[0];

    // Debit sender
    await client.query(
      'UPDATE users SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, senderId]
    );

    // Credit receiver
    await client.query(
      'UPDATE users SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, receiver.id]
    );

    // Record transaction
    const txResult = await client.query(
      'INSERT INTO transactions (sender_id, receiver_id, amount, type, status, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [senderId, receiver.id, amount, 'transfer', 'completed', description || 'Transferência']
    );

    await client.query('COMMIT');

    // Audit
    await query(
      'INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)',
      [senderId, 'TRANSFER_COMPLETED', req.ip, JSON.stringify({ amount, to: receiver.name })]
    );

    res.status(201).json({
      message: 'Transfer completed successfully',
      transaction: txResult.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;