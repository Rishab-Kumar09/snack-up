const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleData() {
  try {
    // First, create a sample company
    console.log('Creating sample company...');
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([
        {
          name: 'Sample Company Inc.'
        }
      ])
      .select()
      .single();

    if (companyError) {
      throw companyError;
    }

    console.log('Sample company created:', company);

    // Then, create a sample admin user
    console.log('Creating sample admin user...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          name: 'Admin User',
          email: 'admin@samplecompany.com',
          password: 'admin123',
          is_admin: true,
          company_id: company.id
        }
      ])
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    console.log('Sample admin user created:', user);

    // Finally, add sample snacks
    console.log('Adding sample snacks...');
    const { data: snacks, error: snacksError } = await supabase
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

    if (snacksError) {
      throw snacksError;
    }

    console.log('Sample snacks added successfully:', snacks);

    // Create sample preferences
    console.log('Creating sample preferences...');
    const preferencesData = snacks.map(snack => ({
      user_id: user.id,
      snack_id: snack.id,
      rating: Math.floor(Math.random() * 5) + 1,
      daily_quantity: Math.floor(Math.random() * 3) + 1
    }));

    const { error: preferencesError } = await supabase
      .from('preferences')
      .insert(preferencesData);

    if (preferencesError) {
      throw preferencesError;
    }

    console.log('Sample preferences created successfully');

    console.log('\nAll sample data has been created successfully!');
    console.log('You can now log in with:');
    console.log('Email: admin@samplecompany.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error adding sample data:', error);
  }
}

addSampleData(); 