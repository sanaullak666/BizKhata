const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'khataflow-super-secure-production-secret-2026';

function authenticateToken(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  let userId = null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }

  const user = db.prepare(`
    SELECT u.*, b.name as business_name, b.currency, b.currency_symbol, b.upi_id as business_upi
    FROM users u
    JOIN businesses b ON u.business_id = b.id
    WHERE u.id = ?
  `).get(userId);

  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: `Account is ${user.status}. Please contact administrator.` });
  }

  // If salesman, fetch staff permissions
  let permissions = {};
  if (user.role === 'salesman') {
    const permRow = db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(user.id);
    if (permRow) {
      permissions = permRow;
    } else {
      // Default permissions
      permissions = {
        can_view_customers: 1,
        can_add_customers: 1,
        can_edit_customers: 1,
        can_delete_customers: 0,
        can_add_transactions: 1,
        can_delete_transactions: 0,
        can_create_invoices: 1,
        can_record_collections: 1,
        can_send_reminders: 1,
        can_view_other_salesmen: 0,
        can_view_reports: 0,
        can_manage_staff: 0,
        can_change_settings: 0,
      };
    }
  }

  req.user = {
    ...user,
    permissions,
  };
  req.businessId = user.business_id;

  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden. Requires role: ${roles.join(' or ')}.` });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET,
};
