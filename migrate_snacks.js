const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateSnacks() {
  try {
    console.log('Starting snacks migration...');

    // Get the first company's ID to use as default
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id')
      .limit(1);

    if (companiesError) {
      throw new Error('Failed to fetch default company: ' + companiesError.message);
    }

    if (!companies || companies.length === 0) {
      throw new Error('No companies found. Please create at least one company first.');
    }

    const defaultCompanyId = companies[0].id;

    // Update all snacks without a company_id
    const { data, error } = await supabase
      .from('snacks')
      .update({ company_id: defaultCompanyId })
      .is('company_id', null);

    if (error) {
      throw new Error('Failed to update snacks: ' + error.message);
    }

    console.log('Migration completed successfully!');
    console.log('Updated snacks with default company ID:', defaultCompanyId);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateSnacks(); 