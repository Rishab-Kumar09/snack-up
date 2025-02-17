const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Get all companies
router.get('/', async (req, res) => {
  const db = await getDatabase();
  
  db.all('SELECT * FROM companies ORDER BY name', [], (err, companies) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch companies' });
    }
    res.json(companies);
  });
});

module.exports = router; 