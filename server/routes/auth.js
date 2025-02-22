const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, is_admin, is_super_admin, company_id')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!users) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        isAdmin: users.is_admin,
        isSuperAdmin: users.is_super_admin,
        companyId: users.company_id // This will be a UUID from Supabase
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Registration endpoint
router.post('/register', async (req, res) => {
  const { name, email, password, role, companyName, companyId } = req.body;

  // Basic validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate role
  if (role !== 'customer' && role !== 'admin') {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let userCompanyId = null;

    // For admin role, create new company
    if (role === 'admin') {
      if (!companyName) {
        return res.status(400).json({ error: 'Company name is required for admin registration' });
      }

      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({ name: companyName })
        .select()
        .single();

      if (companyError) {
        if (companyError.code === '23505') {
          return res.status(400).json({ error: 'Company name already exists' });
        }
        throw companyError;
      }

      userCompanyId = newCompany.id; // This will be a UUID
    } else {
      // For customer role, validate the provided companyId
      if (!companyId) {
        return res.status(400).json({ error: 'Company selection is required for employee registration' });
      }
      userCompanyId = companyId;
    }

    // Create user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password,
        is_admin: role === 'admin',
        company_id: userCompanyId
      })
      .select()
      .single();

    if (userError) {
      throw userError;
    }

    res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isAdmin: newUser.is_admin,
        companyId: newUser.company_id // This will be a UUID
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get company users
router.get('/company-users/:companyId', async (req, res) => {
  const { companyId } = req.params;

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, is_admin')
      .eq('company_id', companyId);

    if (error) {
      throw error;
    }

    res.json(users);
  } catch (error) {
    console.error('Error fetching company users:', error);
    res.status(500).json({ error: 'Failed to fetch company users' });
  }
});

module.exports = router;