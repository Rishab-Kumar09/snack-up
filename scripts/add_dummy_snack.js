const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addDummySnack() {
  try {
    console.log('Starting cleanup...');

    // Delete in correct order to handle foreign key constraints
    console.log('Deleting order items...');
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (orderItemsError) {
      console.error('Error deleting order items:', orderItemsError);
    }

    console.log('Deleting preferences...');
    const { error: preferencesError } = await supabase
      .from('preferences')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (preferencesError) {
      console.error('Error deleting preferences:', preferencesError);
    }

    console.log('Deleting inventory tracking...');
    const { error: trackingError } = await supabase
      .from('snack_inventory_tracking')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (trackingError) {
      console.error('Error deleting tracking:', trackingError);
    }

    console.log('Deleting snacks...');
    const { error: snacksError } = await supabase
      .from('snacks')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');
    
    if (snacksError) {
      console.error('Error deleting snacks:', snacksError);
      throw snacksError;
    }

    // Add single dummy snack
    console.log('Adding dummy snack...');
    const { data, error } = await supabase
      .from('snacks')
      .insert([
        {
          name: 'Classic Chocolate Chip Cookie',
          description: 'A soft, chewy cookie loaded with rich chocolate chips. Perfect with milk!',
          price: 2.50,
          ingredients: 'flour, butter, sugar, brown sugar, eggs, chocolate chips, vanilla extract, baking soda, salt',
          is_available: true,
          image_data: null
        }
      ])
      .select();

    if (error) {
      console.error('Error adding snack:', error);
      throw error;
    }

    // Verify final state
    const { data: finalSnacks, error: finalError } = await supabase
      .from('snacks')
      .select('*');

    if (finalError) {
      console.error('Error checking final state:', finalError);
      throw finalError;
    }

    console.log(`Final number of snacks: ${finalSnacks.length}`);
    
    if (finalSnacks.length === 1) {
      console.log('Success! Only one snack remains in the database.');
    } else {
      throw new Error(`Expected 1 snack, but found ${finalSnacks.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDummySnack(); 