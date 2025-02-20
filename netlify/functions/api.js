const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

// Create Express app
const app = express();

// Enable CORS with specific origin
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://snack-up.netlify.app'
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import routes
const authRoutes = require('../../server/routes/auth');
const snackRoutes = require('../../server/routes/snacks');
const preferencesRoutes = require('../../server/routes/preferences');
const ordersRoutes = require('../../server/routes/orders');
const companiesRoutes = require('../../server/routes/companies');
const inventoryRouter = require('../../server/routes/inventory');

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/snacks', snackRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/inventory', inventoryRouter);
app.use('/api/companies', companiesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;
  res.status(statusCode).json({ error: message });
});

// Export the serverless handler
module.exports.handler = serverless(app); 