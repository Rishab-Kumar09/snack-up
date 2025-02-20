const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get preferences for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data: preferences, error } = await supabase
      .from('preferences')
      .select(`
        *,
        snacks (
          name,
          description,
          price
        )
      `)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Get all preferences for company
router.get('/company/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const { data: preferences, error } = await supabase
      .from('preferences')
      .select(`
        *,
        snacks (
          name
        ),
        users!inner (
          name,
          email
        )
      `)
      .eq('users.company_id', companyId);

    if (error) {
      throw error;
    }

    // Format the response
    const formattedPreferences = preferences.map(pref => ({
      id: pref.id,
      user_name: pref.users.name,
      user_email: pref.users.email,
      snack_name: pref.snacks.name,
      daily_quantity: pref.daily_quantity,
      rating: pref.rating
    }));

    res.json(formattedPreferences);
  } catch (error) {
    console.error('Error fetching company preferences:', error);
    res.status(500).json({ error: 'Failed to fetch company preferences' });
  }
});

// Update or create preference
router.post('/', async (req, res) => {
  const { userId, snackId, rating, dailyQuantity } = req.body;

  if (!userId || !snackId || typeof dailyQuantity !== 'number') {
    return res.status(400).json({ error: 'User ID, snack ID, and daily quantity are required and must be numbers' });
  }

  if (dailyQuantity < 0) {
    return res.status(400).json({ error: 'Daily quantity cannot be negative' });
  }

  if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    // Check if preference exists
    const { data: existing, error: checkError } = await supabase
      .from('preferences')
      .select('id')
      .eq('user_id', userId)
      .eq('snack_id', snackId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw checkError;
    }

    let result;
    if (existing) {
      // Update existing preference
      const updateData = { daily_quantity: dailyQuantity };
      if (rating !== undefined) {
        updateData.rating = rating;
      }

      result = await supabase
        .from('preferences')
        .update(updateData)
        .eq('id', existing.id);
    } else {
      // Insert new preference
      result = await supabase
        .from('preferences')
        .insert({
          user_id: userId,
          snack_id: snackId,
          rating: rating || null,
          daily_quantity: dailyQuantity
        });
    }

    if (result.error) {
      throw result.error;
    }

    res.status(200).json({ message: existing ? 'Preference updated successfully' : 'Preference created successfully' });
  } catch (error) {
    console.error('Error updating preference:', error);
    res.status(500).json({ error: 'Failed to update preference' });
  }
});

module.exports = router;