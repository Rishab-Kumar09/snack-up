require('dotenv').config();
const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { OpenAI } = require('openai');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Delete existing database file if it exists
const dbFile = 'snackup.db';
if (fs.existsSync(dbFile)) {
  fs.unlinkSync(dbFile);
  console.log('Existing database deleted');
}

// Initialize SQLite database
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    // Initialize database schema immediately after connection
    initDatabase();
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../build')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Add sample snacks after creating tables
const sampleSnacks = [
  {
    name: 'Mixed Nuts',
    description: 'A healthy mix of almonds, cashews, and walnuts',
    price: 5.99,
    stock: 100,
    ingredients: 'Almonds, cashews, walnuts, salt'
  },
  {
    name: 'Dark Chocolate Bar',
    description: '72% cocoa dark chocolate bar',
    price: 3.99,
    stock: 50,
    ingredients: 'Cocoa mass, cocoa butter, sugar, vanilla'
  },
  {
    name: 'Trail Mix',
    description: 'Energy-packed mix of nuts, dried fruits, and chocolate',
    price: 4.99,
    stock: 75,
    ingredients: 'Peanuts, raisins, M&Ms, dried cranberries'
  },
  {
    name: 'Potato Chips',
    description: 'Classic salted potato chips',
    price: 2.99,
    stock: 150,
    ingredients: 'Potatoes, vegetable oil, salt'
  }
];

// Database initialization
const initDatabase = () => {
  db.serialize(() => {
    // Create companies table
    db.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating companies table:', err);
      } else {
        console.log('Companies table created');
      }
    });

    // Create users table with company relationship
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table created');
        // Insert default admin user
        db.get('SELECT * FROM users WHERE is_admin = 1', [], (err, row) => {
          if (err) {
            console.error('Error checking for admin:', err);
          } else if (!row) {
            db.run(`
              INSERT INTO users (name, email, password, is_admin)
              VALUES ('Admin', 'admin@snackup.com', 'admin123', 1)
            `, (err) => {
              if (err) {
                console.error('Error creating admin user:', err);
              } else {
                console.log('Default admin user created');
              }
            });
          }
        });
      }
    });

    // Create snacks table
    db.run(`
      CREATE TABLE IF NOT EXISTS snacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        ingredients TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating snacks table:', err);
      } else {
        console.log('Snacks table created');
        // Insert sample snacks
        sampleSnacks.forEach(snack => {
          db.run(`
            INSERT INTO snacks (name, description, price, stock, ingredients)
            VALUES (?, ?, ?, ?, ?)
          `, [snack.name, snack.description, snack.price, snack.stock, snack.ingredients], (err) => {
            if (err) {
              console.error('Error inserting sample snack:', err);
            } else {
              console.log(`Sample snack "${snack.name}" created`);
            }
          });
        });
      }
    });

    // Create preferences table
    db.run(`
      CREATE TABLE IF NOT EXISTS preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        snack_id INTEGER,
        rating INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (snack_id) REFERENCES snacks(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating preferences table:', err);
      } else {
        console.log('Preferences table created');
      }
    });

    // Create orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating orders table:', err);
      } else {
        console.log('Orders table created');
      }
    });
  });
};

// Add companies endpoints
app.post('/api/companies', (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Company name is required' });
    return;
  }

  db.run(
    'INSERT INTO companies (name) VALUES (?)',
    [name],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          res.status(400).json({ error: 'Company name already exists' });
        } else {
          res.status(500).json({ error: 'Failed to create company' });
        }
        return;
      }

      res.status(201).json({
        company: {
          id: this.lastID,
          name
        }
      });
    }
  );
});

app.get('/api/companies', (req, res) => {
  db.all('SELECT id, name FROM companies', [], (err, companies) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch companies' });
      return;
    }
    res.json(companies);
  });
});

// Update registration endpoint
app.post('/api/register', (req, res) => {
  const { name, email, password, role, companyName, companyId } = req.body;

  // Basic validation
  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  // Validate role
  if (role !== 'customer' && role !== 'admin') {
    res.status(400).json({ error: 'Invalid role specified' });
    return;
  }

  // For admin role, company name is required
  if (role === 'admin' && !companyName) {
    res.status(400).json({ error: 'Company name is required for admin registration' });
    return;
  }

  // For customer role, company ID is required
  if (role === 'customer' && !companyId) {
    res.status(400).json({ error: 'Company selection is required for employee registration' });
    return;
  }

  // Check if user already exists
  db.get('SELECT id FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (user) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const createUser = (companyId) => {
      db.run(
        'INSERT INTO users (name, email, password, is_admin, company_id) VALUES (?, ?, ?, ?, ?)',
        [name, email, password, role === 'admin' ? 1 : 0, companyId],
        function(err) {
          if (err) {
            res.status(500).json({ error: 'Failed to create user' });
            return;
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
              res.status(400).json({ error: 'Company name already exists' });
            } else {
              res.status(500).json({ error: 'Failed to create company' });
            }
            return;
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

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  
  db.get(
    'SELECT id, name, email, is_admin FROM users WHERE email = ? AND password = ?',
    [email, password],
    (err, user) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }
      
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // In a real app, you would use proper password hashing and JWT tokens
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isAdmin: user.is_admin === 1
        }
      });
    }
  );
});

// API Routes
app.get('/api/snacks', (req, res) => {
  db.all('SELECT * FROM snacks', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Modified recommendations endpoint to work without OpenAI
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      // Return static recommendations if no valid API key
      return res.json({
        recommendations: "Based on our popular items, we recommend trying our Trail Mix for energy, Dark Chocolate Bar for a sweet treat, and Mixed Nuts for a healthy snack option."
      });
    }

    db.all(`
      SELECT s.name, p.rating 
      FROM preferences p 
      JOIN snacks s ON p.snack_id = s.id 
      WHERE p.user_id = ?
    `, [userId], async (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a snack recommendation expert. Based on user preferences, suggest snacks they might enjoy."
            },
            {
              role: "user",
              content: `Based on these preferences: ${JSON.stringify(rows)}, what snacks would you recommend?`
            }
          ],
        });

        res.json({ recommendations: completion.choices[0].message.content });
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        res.json({
          recommendations: "Based on our popular items, we recommend trying our Trail Mix for energy, Dark Chocolate Bar for a sweet treat, and Mixed Nuts for a healthy snack option."
        });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// Start server with port fallback
const startServer = (port) => {
  try {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer(PORT); 