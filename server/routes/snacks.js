const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

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
  const { companyId } = req.query;
  let query = supabase.from('snacks').select('*');
  
  // If companyId is provided, filter by it
  if (companyId) {
    query = query.eq('company_id', companyId);
  }
  
  const { data: snacks, error } = await query;
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  const snacksWithDietary = snacks.map(snack => ({
    ...snack,
    ...classifySnack(snack.ingredients)
  }));
  
  res.json(snacksWithDietary);
});

// Add new snack
router.post('/', async (req, res) => {
  const { name, description, price, ingredients, image_data, companyId } = req.body;

  if (!name || !description || !price || !ingredients || !companyId) {
    return res.status(400).json({ error: 'All fields are required including company ID' });
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
    const { data, error } = await supabase
      .from('snacks')
      .insert([
        { 
          name, 
          description, 
          price: numericPrice, 
          ingredients, 
          is_available: 1, 
          image_data: image_data || null,
          company_id: companyId
        }
      ]);
    
    if (error) {
      console.error('Error adding snack:', error);
      return res.status(500).json({ error: 'Failed to add snack' });
    }

    res.status(201).json({
      id: data[0].id,
      name,
      description,
      price: numericPrice,
      ingredients,
      is_available: 1,
      image_data: image_data || null,
      company_id: companyId,
      ...classifySnack(ingredients)
    });
  } catch (err) {
    console.error('Error in snack creation:', err);
    res.status(500).json({ error: 'An unexpected error occurred while adding the snack' });
  }
});

// Filter snacks by dietary preferences
router.get('/filter', async (req, res) => {
  const { dairyFree, vegetarian } = req.query;
  const { data: snacks, error } = await supabase
    .from('snacks')
    .select('*');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  let filteredSnacks = snacks.map(snack => ({
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

// Update snack availability
router.put('/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { isAvailable } = req.body;

  if (typeof isAvailable !== 'boolean') {
    return res.status(400).json({ error: 'isAvailable must be a boolean' });
  }

  const { data, error } = await supabase
    .from('snacks')
    .update({ is_available: isAvailable ? 1 : 0 })
    .eq('id', id);
  
  if (error) {
    return res.status(500).json({ error: 'Failed to update snack availability' });
  }

  if (data.length === 0) {
    return res.status(404).json({ error: 'Snack not found' });
  }

  res.json({ message: 'Snack availability updated successfully' });
});

// Add new endpoint for updating snack details
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, ingredients, image_data } = req.body;

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
    const updateData = { name, description, price: numericPrice, ingredients };

    // Only update image if new one is provided
    if (image_data !== undefined) {
      updateData.image_data = image_data;
    }

    const { data, error } = await supabase
      .from('snacks')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('Error updating snack:', error);
      return res.status(500).json({ error: 'Failed to update snack' });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Snack not found' });
    }

    // Get the updated snack to return
    const { data: updatedSnack, error: fetchError } = await supabase
      .from('snacks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      return res.status(500).json({ error: 'Failed to fetch updated snack' });
    }

    res.json({
      ...updatedSnack,
      ...classifySnack(updatedSnack.ingredients)
    });
  } catch (err) {
    console.error('Error in snack update:', err);
    res.status(500).json({ error: 'An unexpected error occurred while updating the snack' });
  }
});

module.exports = router; 