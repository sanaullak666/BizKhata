require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./config/database');
const { seedDatabase } = require('./seed/seedData');

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS for frontend
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req._body = true;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize SQLite database and seed initial business & staff data
initializeDatabase();
seedDatabase();

// Route imports
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/business');
const salesmenRoutes = require('./routes/salesmen');
const customersRoutes = require('./routes/customers');
const transactionsRoutes = require('./routes/transactions');
const collectionsRoutes = require('./routes/collections');
const invoicesRoutes = require('./routes/invoices');
const receiptsRoutes = require('./routes/receipts');
const remindersRoutes = require('./routes/reminders');
const reportsRoutes = require('./routes/reports');
const auditLogsRoutes = require('./routes/auditLogs');
const notificationsRoutes = require('./routes/notifications');
const backupRoutes = require('./routes/backup');

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/salesmen', salesmenRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'KhataFlow Backend API', time: new Date().toISOString() });
});

// Serve frontend static files if client/dist exists
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      next();
    }
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error occurred.',
    message: err.message,
  });
});

if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 KhataFlow Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
