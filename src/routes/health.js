const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// GET /health
router.get('/', async (req, res) => {
  const start = Date.now();
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {}
  };

  // DB check
  try {
    await pool.query('SELECT 1');
    health.checks.database = { status: 'ok', latency: `${Date.now() - start}ms` };
  } catch (err) {
    health.checks.database = { status: 'error', message: err.message };
    health.status = 'degraded';
  }

  // Memory check
  const mem = process.memoryUsage();
  health.checks.memory = {
    status: 'ok',
    heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`
  };

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;