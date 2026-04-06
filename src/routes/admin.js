const express = require('express');
const { query } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard — summary stats
router.get('/dashboard', async (req, res, next) => {
  try {
    const [users, transactions, totalVolume, uploads, recentAudit] = await Promise.all([
      query('SELECT COUNT(*) as total, SUM(balance) as total_balance FROM users WHERE role = $1', ['user']),
      query('SELECT COUNT(*) as total FROM transactions'),
      query('SELECT COALESCE(SUM(amount), 0) as volume FROM transactions WHERE status = $1', ['completed']),
      query('SELECT COUNT(*) as total FROM uploads'),
      query(`
        SELECT a.action, a.ip_address, a.created_at, u.name, u.email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT 10
      `)
    ]);

    res.json({
      stats: {
        totalUsers: parseInt(users.rows[0].total),
        totalBalance: parseFloat(users.rows[0].total_balance || 0),
        totalTransactions: parseInt(transactions.rows[0].total),
        totalVolume: parseFloat(totalVolume.rows[0].volume),
        totalUploads: parseInt(uploads.rows[0].total)
      },
      recentActivity: recentAudit.rows
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/transactions — all transactions
router.get('/transactions', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(`
      SELECT 
        t.id, t.amount, t.type, t.status, t.description, t.created_at,
        sender.name AS sender_name, sender.account_number AS sender_account,
        receiver.name AS receiver_name, receiver.account_number AS receiver_account
      FROM transactions t
      LEFT JOIN users sender ON t.sender_id = sender.id
      LEFT JOIN users receiver ON t.receiver_id = receiver.id
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    const count = await query('SELECT COUNT(*) FROM transactions');

    res.json({
      transactions: result.rows,
      total: parseInt(count.rows[0].count)
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — all users
router.get('/users', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, email, role, balance, account_number, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-logs — audit trail
router.get('/audit-logs', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT a.id, a.action, a.ip_address, a.user_agent, a.details, a.created_at,
             u.name, u.email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 200
    `);
    res.json({ logs: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;