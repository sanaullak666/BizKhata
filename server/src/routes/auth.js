const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Login with email or mobile
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please enter your registered mobile number or email and password.' });
    }

    const cleanIdentifier = identifier.trim();

    const user = await db.prepare(`
      SELECT u.*, b.name as business_name, b.currency, b.currency_symbol
      FROM users u
      JOIN businesses b ON u.business_id = b.id
      WHERE (u.email = ? OR u.mobile = ?)
    `).get(cleanIdentifier, cleanIdentifier);

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please check your credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: `Account is ${user.status}. Please contact the business owner.` });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    // Fetch staff permissions if salesman
    let permissions = {};
    if (user.role === 'salesman') {
      const perm = await db.prepare(`SELECT * FROM staff_permissions WHERE user_id = ?`).get(user.id);
      if (perm) permissions = perm;
    }

    const token = jwt.sign(
      { userId: user.id, businessId: user.business_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { password_hash, ...safeUser } = user;

    await logAudit({
      businessId: user.business_id,
      userId: user.id,
      userName: user.full_name,
      action: 'User Logged In',
      entityType: 'User',
      entityId: user.id,
      details: `${user.full_name} logged in (${user.role}).`,
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
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during login.' });
  }
});

// Register New Business & Owner (Production Sign Up Flow)
router.post('/register-business', async (req, res) => {
  try {
    const {
      business_name,
      owner_name,
      mobile,
      email,
      password,
      address,
      city,
      gstin,
      upi_id,
    } = req.body;

    if (!business_name || !owner_name || !mobile || !password) {
      return res.status(400).json({ error: 'Business name, owner name, mobile number, and password are required.' });
    }

    const cleanMobile = mobile.trim();
    const cleanEmail = email ? email.trim() : `${cleanMobile}@khataflow.local`;

    // Check if mobile or email is already taken
    const existingUser = await db.prepare(`
      SELECT id FROM users WHERE mobile = ? OR email = ?
    `).get(cleanMobile, cleanEmail);

    if (existingUser) {
      return res.status(400).json({ error: 'A user account with this mobile number or email already exists.' });
    }

    const bizId = 'biz_' + crypto.randomBytes(6).toString('hex');
    const ownerId = 'usr_owner_' + crypto.randomBytes(6).toString('hex');
    const passwordHash = bcrypt.hashSync(password, 10);

    const registerTx = db.transaction(async () => {
      // 1. Create Business
      await db.prepare(`
        INSERT INTO businesses (
          id, name, address, city, phone, email, gstin, upi_id,
          currency, currency_symbol, invoice_prefix, receipt_prefix
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'INR', '₹', 'INV', 'REC')
      `).run(
        bizId,
        business_name.trim(),
        address || null,
        city || null,
        cleanMobile,
        cleanEmail,
        gstin || null,
        upi_id || null
      );

      // 2. Create Owner Account
      await db.prepare(`
        INSERT INTO users (
          id, business_id, role, full_name, mobile, email, employee_id, password_hash,
          designation, joining_date, status
        ) VALUES (?, ?, 'owner', ?, ?, ?, 'OWNER-1', ?, 'Managing Director / Owner', CURRENT_DATE, 'active')
      `).run(
        ownerId,
        bizId,
        owner_name.trim(),
        cleanMobile,
        cleanEmail,
        passwordHash
      );
    });

    await registerTx();

    const token = jwt.sign(
      { userId: ownerId, businessId: bizId, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const owner = await db.prepare(`
      SELECT u.*, b.name as business_name, b.currency, b.currency_symbol
      FROM users u
      JOIN businesses b ON u.business_id = b.id
      WHERE u.id = ?
    `).get(ownerId);

    const { password_hash, ...safeUser } = owner;

    await logAudit({
      businessId: bizId,
      userId: ownerId,
      userName: owner_name,
      action: 'Business Registered',
      entityType: 'Business',
      entityId: bizId,
      details: `Owner ${owner_name} registered new business "${business_name}".`,
      req,
    });

    res.status(201).json({
      message: 'Business registered successfully!',
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Register business error:', err);
    res.status(500).json({ error: err.message || 'Internal error registering business.' });
  }
});

// Get current logged-in user profile
router.get('/me', authenticateToken, (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

// Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Please provide current and new password.' });
    }

    const user = await db.prepare(`SELECT password_hash FROM users WHERE id = ?`).get(req.user.id);
    const isValid = bcrypt.compareSync(current_password, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    await db.prepare(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(newHash, req.user.id);

    await logAudit({
      businessId: req.businessId,
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'Password Changed',
      entityType: 'User',
      entityId: req.user.id,
      details: 'User updated their password.',
      req,
    });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: err.message || 'Internal error changing password.' });
  }
});

module.exports = router;
