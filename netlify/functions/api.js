const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
require('dotenv').config();

// Create Express app
const app = express();

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://snack-up.netlify.app'
    : ['http://localhost:3000', 'http://localhost:3001'],
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Export the serverless handler
module.exports.handler = serverless(app); 