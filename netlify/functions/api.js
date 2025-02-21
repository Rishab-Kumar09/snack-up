const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();
const app = require('../../server/index.js');

// Create Express app
const expressApp = express();

// Enable CORS
expressApp.use(cors({
  origin: '*',
  credentials: true
}));

// Parse JSON bodies
expressApp.use(express.json());
expressApp.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('../../server/routes/auth');
const snackRoutes = require('../../server/routes/snacks');
const preferencesRoutes = require('../../server/routes/preferences');
const ordersRoutes = require('../../server/routes/orders');
const companiesRoutes = require('../../server/routes/companies');
const inventoryRouter = require('../../server/routes/inventory');

// API Routes
expressApp.use('/.netlify/functions/api/auth', authRoutes);
expressApp.use('/.netlify/functions/api/snacks', snackRoutes);
expressApp.use('/.netlify/functions/api/orders', ordersRoutes);
expressApp.use('/.netlify/functions/api/preferences', preferencesRoutes);
expressApp.use('/.netlify/functions/api/inventory', inventoryRouter);
expressApp.use('/.netlify/functions/api/companies', companiesRoutes);

// Error handling middleware
expressApp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Wrap the Express app with serverless
module.exports.handler = serverless(expressApp); 