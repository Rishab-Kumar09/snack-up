const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Starting migration...');

    // Get the first company's ID
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
    console.log('Using default company ID:', defaultCompanyId);

    // Get all snacks
    const { data: snacks, error: snacksError } = await supabase
      .from('snacks')
      .select('id');

    if (snacksError) {
      throw new Error('Failed to fetch snacks: ' + snacksError.message);
    }

    console.log(`Found ${snacks.length} snacks to update`);

    // Update each snack with the company ID
    for (const snack of snacks) {
      const { error: updateError } = await supabase
        .from('snacks')
        .update({ company_id: defaultCompanyId })
        .eq('id', snack.id);

      if (updateError) {
        throw new Error(`Failed to update snack ${snack.id}: ${updateError.message}`);
      }
    }

    console.log('Migration completed successfully!');
    console.log(`Updated ${snacks.length} snacks with company ID: ${defaultCompanyId}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 