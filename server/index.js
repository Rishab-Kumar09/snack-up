require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const serverless = require('serverless-http');

// Import routes
const authRoutes = require('./routes/auth');
const snackRoutes = require('./routes/snacks');
const preferencesRoutes = require('./routes/preferences');
const ordersRoutes = require('./routes/orders');
const companiesRoutes = require('./routes/companies');
const inventoryRouter = require('./routes/inventory');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Enable CORS for all routes
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://snack-up.netlify.app'
    : 'http://localhost:3000',
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
if (process.env.NODE_ENV === 'production') {
  // In production (Netlify), routes need to be prefixed with /.netlify/functions/api
  app.use('/.netlify/functions/api/auth', authRoutes);
  app.use('/.netlify/functions/api/snacks', snackRoutes);
  app.use('/.netlify/functions/api/orders', ordersRoutes);
  app.use('/.netlify/functions/api/preferences', preferencesRoutes);
  app.use('/.netlify/functions/api/inventory', inventoryRouter);
  app.use('/.netlify/functions/api/companies', companiesRoutes);
} else {
  // In development, use /api prefix
  app.use('/api/auth', authRoutes);
  app.use('/api/snacks', snackRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/preferences', preferencesRoutes);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/companies', companiesRoutes);
}

// Static file serving
app.use(express.static(path.join(__dirname, '../build')));

// Catch-all route for React app
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/.netlify/functions/api/')) {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Only start the server in development mode
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for serverless use
module.exports = app; 