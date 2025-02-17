const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Get preferences for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const db = await getDatabase();

  db.all(
    `SELECT p.*, s.name as snack_name, s.description, s.price
     FROM preferences p
     JOIN snacks s ON p.snack_id = s.id
     WHERE p.user_id = ?`,
    [userId],
    (err, preferences) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch preferences' });
      }
      res.json(preferences);
    }
  );
});

// Get all preferences for company
router.get('/company/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const db = await getDatabase();

  db.all(
    `SELECT 
      p.*,
      s.name as snack_name,
      u.name as user_name,
      u.email as user_email
     FROM preferences p
     JOIN snacks s ON p.snack_id = s.id
     JOIN users u ON p.user_id = u.id
     WHERE u.company_id = ?`,
    [companyId],
    (err, preferences) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch company preferences' });
      }
      res.json(preferences);
    }
  );
});

// Update or create preference
router.post('/', async (req, res) => {
  const { userId, snackId, rating, dailyQuantity } = req.body;
  const db = await getDatabase();

  if (!userId || !snackId || typeof rating !== 'number' || typeof dailyQuantity !== 'number') {
    return res.status(400).json({ error: 'All fields are required and must be numbers' });
  }

  if (rating < 0 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 0 and 5' });
  }

  if (dailyQuantity < 0) {
    return res.status(400).json({ error: 'Daily quantity cannot be negative' });
  }

  db.run(
    `INSERT INTO preferences (user_id, snack_id, rating, daily_quantity)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, snack_id) 
     DO UPDATE SET rating = ?, daily_quantity = ?`,
    [userId, snackId, rating, dailyQuantity, rating, dailyQuantity],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save preference' });
      }
      res.status(200).json({ message: 'Preference saved successfully' });
    }
  );
});

module.exports = router; 