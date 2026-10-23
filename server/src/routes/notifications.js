const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.prepare(`
      SELECT * FROM notifications
      WHERE business_id = ? AND user_id = ?
      ORDER BY created_at DESC LIMIT 50
    `).all(req.businessId, req.user.id);

    const countRow = await db.prepare(`
      SELECT count(*) as count FROM notifications
      WHERE business_id = ? AND user_id = ? AND is_read = 0
    `).get(req.businessId, req.user.id);
    const unreadCount = countRow ? countRow.count : 0;

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: err.message || 'Error fetching notifications.' });
  }
});

// Mark single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE id = ? AND user_id = ?
    `).run(req.params.id, req.user.id);

    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: err.message || 'Error marking notification read.' });
  }
});

// Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.prepare(`
      UPDATE notifications SET is_read = 1
      WHERE user_id = ? AND business_id = ?
    `).run(req.user.id, req.businessId);

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: err.message || 'Error marking all notifications read.' });
  }
});

module.exports = router;
