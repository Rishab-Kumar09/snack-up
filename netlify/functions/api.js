const express = require('express');
const serverless = require('serverless-http');
require('dotenv').config();

// Import the Express app
const app = require('../../server/index.js');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Export the serverless handler
module.exports.handler = serverless(app); 