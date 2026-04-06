const express = require('express');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/users/accounts — search accounts for transfer
router.get('/accounts', async (req, res, next) => {
  try {
    const { account } = req.query;
    if (!account || account.length < 3) {
      return res.status(400).json({ error: 'Provide at least 3 characters to search' });
    }

    const result = await query(
      'SELECT name, account_number FROM users WHERE account_number ILIKE $1 AND id != $2 LIMIT 5',
      [`%${account}%`, req.user.id]
    );

    res.json({ accounts: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;