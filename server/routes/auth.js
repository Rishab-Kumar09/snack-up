const express = require('express');
const router = express.Router();
const getDatabase = require('../db/connection');
const db = getDatabase();

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  db.get(
    'SELECT id, name, email, is_admin, is_super_admin, company_id FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin === 1,
          isSuperAdmin: user.is_super_admin === 1,
          companyId: user.company_id
        }
      });
    }
  );
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

  // For admin role, company name is required
  if (role === 'admin' && !companyName) {
    return res.status(400).json({ error: 'Company name is required for admin registration' });
  }

  // For customer role, company ID is required
  if (role === 'customer' && !companyId) {
    return res.status(400).json({ error: 'Company selection is required for employee registration' });
  }

  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const createUser = (companyId) => {
      db.run(
        'INSERT INTO users (name, email, password, is_admin, company_id) VALUES (?, ?, ?, ?, ?)',
        [name, email, password, role === 'admin' ? 1 : 0, companyId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          res.status(201).json({
            user: {
              id: this.lastID,
              name,
              email,
              isAdmin: role === 'admin',
              companyId
            }
          });
        }
      );
    };

    if (role === 'admin') {
      // Create new company and then create user
      db.run(
        'INSERT INTO companies (name) VALUES (?)',
        [companyName],
        function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              return res.status(400).json({ error: 'Company name already exists' });
            }
            return res.status(500).json({ error: 'Failed to create company' });
          }
          createUser(this.lastID);
        }
      );
    } else {
      // Create user with existing company ID
      createUser(companyId);
    }
  });
});

// Get company users
router.get('/company-users/:companyId', async (req, res) => {
  const { companyId } = req.params;

  db.all(
    'SELECT id, name, email, is_admin FROM users WHERE company_id = ?',
    [companyId],
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch company users' });
      }
      res.json(users);
    }
  );
});

// Add new admin
router.post('/add-admin', async (req, res) => {
  const { name, email, password, companyId } = req.body;

  // Basic validation
  if (!name || !email || !password || !companyId) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (user) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new admin user
    db.run(
      'INSERT INTO users (name, email, password, is_admin, company_id) VALUES (?, ?, ?, 1, ?)',
      [name, email, password, companyId],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create admin' });
        }

        res.status(201).json({
          user: {
            id: this.lastID,
            name,
            email,
            isAdmin: true,
            companyId
          }
        });
      }
    );
  });
});

// Remove admin privileges
router.put('/remove-admin/:userId', async (req, res) => {
  const { userId } = req.params;
  const { companyId } = req.body;

  // Verify user belongs to company and is not the only admin
  db.get(
    'SELECT COUNT(*) as adminCount FROM users WHERE company_id = ? AND is_admin = 1',
    [companyId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (result.adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the only admin' });
      }

      // Remove admin privileges
      db.run(
        'UPDATE users SET is_admin = 0 WHERE id = ? AND company_id = ?',
        [userId, companyId],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to remove admin privileges' });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: 'User not found or not from specified company' });
          }

          res.json({ message: 'Admin privileges removed successfully' });
        }
      );
    }
  );
});

module.exports = router; 