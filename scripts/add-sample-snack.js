const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleSnack() {
  try {
    const { data, error } = await supabase
      .from('snacks')
      .insert([
        {
          name: 'Trail Mix',
          description: 'A healthy mix of nuts, dried fruits, and dark chocolate',
          price: 4.99,
          ingredients: 'almonds, cashews, dried cranberries, raisins, dark chocolate chips',
          is_available: true,
          image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        },
        {
          name: 'Protein Bar',
          description: 'High-protein snack bar perfect for post-workout',
          price: 3.99,
          ingredients: 'oats, whey protein, honey, dark chocolate, almonds',
          is_available: true,
          image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        },
        {
          name: 'Mixed Nuts',
          description: 'Premium selection of roasted nuts',
          price: 5.99,
          ingredients: 'almonds, cashews, walnuts, pecans, macadamia nuts',
          is_available: true,
          image_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    console.log('Sample snacks added successfully:', data);
  } catch (error) {
    console.error('Error adding sample snacks:', error);
  }
}

addSampleSnack(); 