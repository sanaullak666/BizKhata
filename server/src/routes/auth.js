const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Login with email or mobile
router.post('/login', (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please provide mobile/email and password.' });
  }

  const cleanIdentifier = identifier.trim();

  const user = db.prepare(`
    SELECT u.*, b.name as business_name, b.currency, b.currency_symbol
    FROM users u
    JOIN businesses b ON u.business_id = b.id
    WHERE (u.email = ? OR u.mobile = ?)
  `).get(cleanIdentifier, cleanIdentifier);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: `Account is ${user.status}. Please contact the business owner.` });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid password. Please check and try again.' });
  }

  // Fetch staff permissions if salesman
  let permissions = {};
  if (user.role === 'salesman') {
    const perm = db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(user.id);
    if (perm) permissions = perm;
  }

  const token = jwt.sign(
    { userId: user.id, businessId: user.business_id, role: user.role },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const { password_hash, ...safeUser } = user;

  logAudit({
    businessId: user.business_id,
    userId: user.id,
    userName: user.full_name,
    action: 'User Logged In',
    entityType: 'User',
    entityId: user.id,
    details: `${user.full_name} logged in via ${user.role} portal.`,
    req,
  });

  res.json({
    message: 'Login successful',
    token,
    user: {
      ...safeUser,
      permissions,
    },
  });
});

// Get current user profile
router.get('/me', authenticateToken, (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// Demo accounts for instant 1-click evaluation/testing
router.get('/demo-users', (req, res) => {
  const users = db.prepare(`
    SELECT id, role, full_name, mobile, email, employee_id, designation, status
    FROM users
    WHERE status = 'active'
    ORDER BY role ASC, full_name ASC
  `).all();

  res.json({ demoUsers: users });
});

module.exports = router;
