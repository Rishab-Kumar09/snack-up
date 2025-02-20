const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get all companies
router.get('/', async (req, res) => {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    res.json(companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

module.exports = router; 