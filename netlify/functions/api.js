const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

// Create Express app
const app = express();

// Enable CORS with more permissive settings for debugging
app.use(cors({
  origin: '*', // More permissive for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('../../server/routes/auth');
const snackRoutes = require('../../server/routes/snacks');
const preferencesRoutes = require('../../server/routes/preferences');
const ordersRoutes = require('../../server/routes/orders');
const companiesRoutes = require('../../server/routes/companies');
const inventoryRouter = require('../../server/routes/inventory');

// API Routes
app.use('/auth', authRoutes);
app.use('/snacks', snackRoutes);
app.use('/orders', ordersRoutes);
app.use('/preferences', preferencesRoutes);
app.use('/inventory', inventoryRouter);
app.use('/companies', companiesRoutes);

// Error handling middleware with better logging
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    path: req.path
  });
});

// Handle 404 with more detail
app.use((req, res) => {
  console.log('404 Not Found:', req.method, req.path);
  res.status(404).json({ 
    error: `Route not found: ${req.method} ${req.path}`,
    availableRoutes: ['/auth', '/snacks', '/orders', '/preferences', '/inventory', '/companies']
  });
});

// Export the serverless handler
module.exports.handler = serverless(app); 