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
    // First find user by email only
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password, is_admin, is_super_admin, company_id')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Don't send password back to client
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        isAdmin: userWithoutPassword.is_admin,
        isSuperAdmin: userWithoutPassword.is_super_admin,
        companyId: userWithoutPassword.company_id
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

// Add admin endpoint
router.post('/add-admin', async (req, res) => {
  const { name, email, password, companyId } = req.body;

  // Basic validation
  if (!name || !email || !password || !companyId) {
    return res.status(400).json({ error: 'All fields are required' });
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

    // Create admin user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password,
        is_admin: true,
        company_id: companyId
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
        companyId: newUser.company_id
      }
    });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

// Remove admin endpoint
router.put('/remove-admin/:userId', async (req, res) => {
  const { userId } = req.params;
  const { companyId } = req.body;

  if (!userId || !companyId) {
    return res.status(400).json({ error: 'User ID and company ID are required' });
  }

  try {
    // Check if user exists and is from the same company
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, is_admin, company_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.company_id !== companyId) {
      return res.status(403).json({ error: 'Cannot remove admin from different company' });
    }

    // Update user to remove admin status
    const { error: updateError } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    res.json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

module.exports = router;