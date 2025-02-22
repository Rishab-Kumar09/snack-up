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
  const { data: snacks, error } = await supabase
    .from('snacks')
    .select('*');
  
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
  const { name, description, price, ingredients, image_data, store_url, detected_store } = req.body;

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

  // Validate store URL if provided
  if (store_url && !store_url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid store URL format' });
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
          is_available: true, 
          image_data: image_data || null,
          store_url: store_url || null,
          detected_store: detected_store || null
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding snack:', error);
      return res.status(500).json({ error: 'Failed to add snack' });
    }

    if (!data) {
      return res.status(500).json({ error: 'Failed to create snack' });
    }

    res.status(201).json({
      ...data,
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
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Failed to update snack availability' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Snack not found' });
  }

  res.json({ message: 'Snack availability updated successfully', snack: data });
});

// Update snack details
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, price, ingredients, image_data, store_url, detected_store } = req.body;

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

  // Validate store URL if provided and not empty
  if (store_url && !store_url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid store URL format' });
  }

  try {
    const updateData = { 
      name, 
      description, 
      price: numericPrice, 
      ingredients,
      image_data: image_data === undefined ? undefined : image_data,
      store_url: store_url === undefined ? undefined : store_url,
      detected_store: detected_store === undefined ? undefined : detected_store
    };

    const { data, error } = await supabase
      .from('snacks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating snack:', error);
      return res.status(500).json({ error: 'Failed to update snack' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Snack not found' });
    }

    // Return the updated snack with dietary classifications
    res.json({
      ...data,
      ...classifySnack(data.ingredients)
    });
  } catch (err) {
    console.error('Error in snack update:', err);
    res.status(500).json({ error: 'An unexpected error occurred while updating the snack' });
  }
});

// Delete snack
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Delete related records first
    await supabase.from('preferences').delete().eq('snack_id', id);
    await supabase.from('order_items').delete().eq('snack_id', id);
    await supabase.from('snack_inventory_tracking').delete().eq('snack_id', id);

    // Delete the snack
    const { error } = await supabase
      .from('snacks')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Snack deleted successfully' });
  } catch (error) {
    console.error('Error deleting snack:', error);
    res.status(500).json({ error: 'Failed to delete snack' });
  }
});

module.exports = router; 