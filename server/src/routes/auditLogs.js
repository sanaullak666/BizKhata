const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get audit logs with filters (Owner only)
router.get('/', authenticateToken, requireRole('owner'), (req, res) => {
  const { entity_type, user_id, search, limit = 100 } = req.query;

  let query = `
    SELECT * FROM audit_logs
    WHERE business_id = ?
  `;
  const params = [req.businessId];

  if (entity_type) {
    query += ` AND entity_type = ?`;
    params.push(entity_type);
  }

  if (user_id) {
    query += ` AND user_id = ?`;
    params.push(user_id);
  }

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    query += ` AND (action LIKE ? OR details LIKE ? OR user_name LIKE ?)`;
    params.push(term, term, term);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(Number(limit) || 100);

  const logs = db.prepare(query).all(...params);

  res.json({ logs });
});

module.exports = router;
