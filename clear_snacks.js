const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearSnacks() {
  try {
    console.log('Clearing snack-related data...');
    
    // Delete in reverse order of dependencies
    console.log('Clearing snack inventory tracking...');
    await supabase.from('snack_inventory_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Clearing order items...');
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Clearing preferences...');
    await supabase.from('preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Clearing snacks...');
    await supabase.from('snacks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('All snack-related data cleared successfully!');
  } catch (error) {
    console.error('Failed to clear snack data:', error);
    process.exit(1);
  }
}

clearSnacks(); 