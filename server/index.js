require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const snackRoutes = require('./routes/snacks');
const preferencesRoutes = require('./routes/preferences');
const ordersRoutes = require('./routes/orders');
const companiesRoutes = require('./routes/companies');
const inventoryRouter = require('./routes/inventory');

// Import middleware
const authMiddleware = require('./middleware/auth');

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/api/snacks', authMiddleware, snackRoutes);
app.use('/api/preferences', authMiddleware, preferencesRoutes);
app.use('/api/orders', authMiddleware, ordersRoutes);
app.use('/api/companies', authMiddleware, companiesRoutes);
app.use('/api/inventory', authMiddleware, inventoryRouter);

// Static file serving - this comes AFTER API routes
app.use(express.static(path.join(__dirname, '../build')));

// Catch-all route for React app - this must be LAST
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 