const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('../../server/routes/auth');
const snackRoutes = require('../../server/routes/snacks');
const preferencesRoutes = require('../../server/routes/preferences');
const ordersRoutes = require('../../server/routes/orders');
const companiesRoutes = require('../../server/routes/companies');
const inventoryRouter = require('../../server/routes/inventory');

// Import middleware
const authMiddleware = require('../../server/middleware/auth');

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: '*',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes
app.use('/.netlify/functions/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/.netlify/functions/api/snacks', authMiddleware, snackRoutes);
app.use('/.netlify/functions/api/preferences', authMiddleware, preferencesRoutes);
app.use('/.netlify/functions/api/orders', authMiddleware, ordersRoutes);
app.use('/.netlify/functions/api/companies', authMiddleware, companiesRoutes);
app.use('/.netlify/functions/api/inventory', authMiddleware, inventoryRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the serverless handler
module.exports.handler = serverless(app); 