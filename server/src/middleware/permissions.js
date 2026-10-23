const { db } = require('../config/database');

/**
 * Check if the current user has a specific granular permission
 */
function checkPermission(permissionName) {
  return (req, res, next) => {
    // Owner has unrestricted access
    if (req.user && req.user.role === 'owner') {
      return next();
    }

    if (!req.user || req.user.role !== 'salesman') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (req.user.permissions && req.user.permissions[permissionName] === 1) {
      return next();
    }

    return res.status(403).json({
      error: `Permission denied. You do not have permission for: ${permissionName.replace(/_/g, ' ')}.`,
      requiredPermission: permissionName,
    });
  };
}

/**
 * Verify whether the user can access this customer (Salesman Customer Visibility Check)
 */
async function verifyCustomerAccess(req, res, next) {
  const customerId = req.params.customerId || req.params.id || req.body.customer_id;

  if (!customerId) {
    return next();
  }

  try {
    // Owner can access all customers in their business
    if (req.user.role === 'owner') {
      const cust = await db.prepare(`SELECT business_id FROM customers WHERE id = ?`).get(customerId);
      if (!cust || cust.business_id !== req.businessId) {
        return res.status(404).json({ error: 'Customer not found.' });
      }
      return next();
    }

    // Salesman check
    if (req.user.role === 'salesman') {
      // If salesman has permission to view other salesmen's customers
      if (req.user.permissions && req.user.permissions.can_view_other_salesmen === 1) {
        const cust = await db.prepare(`SELECT business_id FROM customers WHERE id = ?`).get(customerId);
        if (!cust || cust.business_id !== req.businessId) {
          return res.status(404).json({ error: 'Customer not found.' });
        }
        return next();
      }

      // Verify active assignment
      const assignment = await db.prepare(`
        SELECT id FROM customer_assignments 
        WHERE customer_id = ? AND salesman_id = ? AND status = 'active'
      `).get(customerId, req.user.id);

      if (!assignment) {
        return res.status(403).json({
          error: 'Access denied: This customer is not assigned to you. Contact the business owner for assignment.',
          assigned: false,
        });
      }

      return next();
    }

    return res.status(403).json({ error: 'Unauthorized.' });
  } catch (err) {
    console.error('Customer access check error:', err);
    return res.status(500).json({ error: 'Internal permission check error.' });
  }
}

module.exports = {
  checkPermission,
  verifyCustomerAccess,
};
