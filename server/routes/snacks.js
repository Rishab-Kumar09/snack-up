const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');

// Helper functions for dietary classification
const dairyIngredients = [
  'milk', 'cream', 'cheese', 'butter', 'yogurt', 'whey', 'casein', 'lactose'
];

const nonVegIngredients = [
  'meat', 'beef', 'chicken', 'pork', 'fish', 'egg', 'eggs', 'gelatin'
];

const nonVeganIngredients = [
  ...dairyIngredients,
  ...nonVegIngredients,
  'honey'
];

const classifySnack = (ingredients) => {
  if (!ingredients) return { isDairyFree: true, isVegetarian: true, isVegan: true };
  
  const ingredientsList = ingredients.toLowerCase().split(',').map(i => i.trim());
  
  const isDairyFree = !ingredientsList.some(ingredient => 
    dairyIngredients.some(dairy => ingredient.includes(dairy))
  );
  
  const isVegetarian = !ingredientsList.some(ingredient =>
    nonVegIngredients.some(nonVeg => ingredient.includes(nonVeg))
  );
  
  const isVegan = !ingredientsList.some(ingredient =>
    nonVeganIngredients.some(nonVegan => ingredient.includes(nonVegan))
  );
  
  return { isDairyFree, isVegetarian, isVegan };
};

// Get all snacks
router.get('/', async (req, res) => {
  const db = await getDatabase();
  
  db.all('SELECT * FROM snacks', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const snacksWithDietary = rows.map(snack => ({
      ...snack,
      ...classifySnack(snack.ingredients)
    }));
    
    res.json(snacksWithDietary);
  });
});

// Add new snack
router.post('/', async (req, res) => {
  const { name, description, price, ingredients, image_data } = req.body;
  const db = await getDatabase();

  if (!name || !description || !price || !ingredients) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Convert price to a decimal number
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  // Validate image data if provided
  if (image_data && !image_data.startsWith('data:image')) {
    return res.status(400).json({ error: 'Invalid image format. Must be a base64 encoded image.' });
  }

  try {
    db.run(
      'INSERT INTO snacks (name, description, price, ingredients, is_available, image_data) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, numericPrice, ingredients, 1, image_data || null],
      function(err) {
        if (err) {
          console.error('Error adding snack:', err);
          return res.status(500).json({ error: 'Failed to add snack' });
        }

        res.status(201).json({
          id: this.lastID,
          name,
          description,
          price: numericPrice,
          ingredients,
          is_available: 1,
          image_data: image_data || null,
          ...classifySnack(ingredients)
        });
      }
    );
  } catch (err) {
    console.error('Error in snack creation:', err);
    res.status(500).json({ error: 'An unexpected error occurred while adding the snack' });
  }
});

// Filter snacks by dietary preferences
router.get('/filter', async (req, res) => {
  const { dairyFree, vegetarian } = req.query;
  const db = await getDatabase();
  
  db.all('SELECT * FROM snacks', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    let filteredSnacks = rows.map(snack => ({
      ...snack,
      ...classifySnack(snack.ingredients)
    }));
    
    if (dairyFree === 'true') {
      filteredSnacks = filteredSnacks.filter(snack => snack.isDairyFree);
    }
    
    if (vegetarian === 'true') {
      filteredSnacks = filteredSnacks.filter(snack => snack.isVegetarian);
    }
    
    res.json(filteredSnacks);
  });
});

// Update snack availability
router.put('/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;
  const db = await getDatabase();

  if (typeof isAvailable !== 'boolean') {
    return res.status(400).json({ error: 'isAvailable must be a boolean' });
  }

  db.run(
    'UPDATE snacks SET is_available = ? WHERE id = ?',
    [isAvailable ? 1 : 0, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update snack availability' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Snack not found' });
      }

      res.json({ message: 'Snack availability updated successfully' });
    }
  );
});

// Add new endpoint for updating snack details
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, ingredients, image_data } = req.body;
  const db = await getDatabase();

  if (!name || !description || !price || !ingredients) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Convert price to a decimal number
  const numericPrice = parseFloat(price);
  if (isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid positive number' });
  }

  // Validate image data if provided
  if (image_data && !image_data.startsWith('data:image')) {
    return res.status(400).json({ error: 'Invalid image format. Must be a base64 encoded image.' });
  }

  try {
    let query = 'UPDATE snacks SET name = ?, description = ?, price = ?, ingredients = ?';
    let params = [name, description, numericPrice, ingredients];

    // Only update image if new one is provided
    if (image_data !== undefined) {
      query += ', image_data = ?';
      params.push(image_data);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function(err) {
      if (err) {
        console.error('Error updating snack:', err);
        return res.status(500).json({ error: 'Failed to update snack' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Snack not found' });
      }

      // Get the updated snack to return
      db.get('SELECT * FROM snacks WHERE id = ?', [id], (err, updatedSnack) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch updated snack' });
        }

        res.json({
          ...updatedSnack,
          ...classifySnack(updatedSnack.ingredients)
        });
      });
    });
  } catch (err) {
    console.error('Error in snack update:', err);
    res.status(500).json({ error: 'An unexpected error occurred while updating the snack' });
  }
});

module.exports = router; 