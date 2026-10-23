const { db } = require('../config/database');
const crypto = require('crypto');

function logAudit({ businessId, userId, userName, action, entityType, entityId, details, req }) {
  try {
    const id = 'aud_' + crypto.randomBytes(8).toString('hex');
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : 'system';
    
    db.prepare(`
      INSERT INTO audit_logs (id, business_id, user_id, user_name, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      businessId,
      userId || null,
      userName || 'System',
      action,
      entityType,
      entityId ? String(entityId) : null,
      typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ip
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

function notifyUser({ businessId, userId, title, message, type = 'info', link = null }) {
  try {
    const id = 'notif_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO notifications (id, business_id, user_id, title, message, type, link)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, businessId, userId, title, message, type, link);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

function notifyOwner({ businessId, title, message, type = 'info', link = null }) {
  try {
    const owners = db.prepare(`SELECT id FROM users WHERE business_id = ? AND role = 'owner'`).all(businessId);
    for (const owner of owners) {
      notifyUser({ businessId, userId: owner.id, title, message, type, link });
    }
  } catch (err) {
    console.error('Notify owner error:', err.message);
  }
}

module.exports = {
  logAudit,
  notifyUser,
  notifyOwner,
};
