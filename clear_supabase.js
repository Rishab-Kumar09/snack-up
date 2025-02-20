const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTables() {
  try {
    console.log('Clearing tables...');
    
    // Delete in reverse order of dependencies
    await supabase.from('snack_inventory_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('preferences').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('snacks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('All tables cleared successfully!');
  } catch (error) {
    console.error('Failed to clear tables:', error);
    process.exit(1);
  }
}

clearTables(); 