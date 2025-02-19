const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');
const db = getDatabase();

// Get all companies
router.get('/', async (req, res) => {
  db.all('SELECT * FROM companies ORDER BY name', [], (err, companies) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch companies' });
    }
    res.json(companies);
  });
});

module.exports = router; 