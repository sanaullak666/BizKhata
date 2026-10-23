const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get notifications for current user
router.get('/', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT * FROM notifications
    WHERE business_id = ? AND user_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(req.businessId, req.user.id);

  const unreadCount = db.prepare(`
    SELECT count(*) as count FROM notifications
    WHERE business_id = ? AND user_id = ? AND is_read = 0
  `).get(req.businessId, req.user.id).count;

  res.json({ notifications, unreadCount });
});

// Mark single notification as read
router.put('/:id/read', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE notifications SET is_read = 1
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  res.json({ message: 'Marked as read.' });
});

// Mark all as read
router.put('/read-all', authenticateToken, (req, res) => {
  db.prepare(`
    UPDATE notifications SET is_read = 1
    WHERE user_id = ? AND business_id = ?
  `).run(req.user.id, req.businessId);

  res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;
