require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const getDatabase = require('./db/connection');

// Import routes
const authRoutes = require('./routes/auth');
const snackRoutes = require('./routes/snacks');
const preferencesRoutes = require('./routes/preferences');
const ordersRoutes = require('./routes/orders');
const companiesRoutes = require('./routes/companies');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes - these must come BEFORE the static file middleware
app.use('/api/auth', authRoutes);
app.use('/api/snacks', snackRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/companies', companiesRoutes);

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

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await getDatabase();
    console.log('Connected to SQLite database');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 