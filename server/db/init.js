const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database initialization
const initDatabase = () => {
  const dbPath = path.join(__dirname, '../../snackup.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  
  // Initialize tables synchronously
  db.serialize(() => {
    // Create companies table
    db.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT 0,
        is_super_admin BOOLEAN DEFAULT 0,
        company_id INTEGER,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `);

    // Create snacks table
    db.run(`
      CREATE TABLE IF NOT EXISTS snacks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        ingredients TEXT,
        is_available BOOLEAN DEFAULT 1
      )
    `);

    // Create preferences table
    db.run(`
      CREATE TABLE IF NOT EXISTS preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        snack_id INTEGER,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        daily_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (snack_id) REFERENCES snacks(id),
        UNIQUE(user_id, snack_id)
      )
    `);

    // Create orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        company_id INTEGER,
        total_cost DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        has_been_delivered INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )
    `);

    // Create order_items table
    db.run(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        snack_id INTEGER,
        quantity INTEGER NOT NULL,
        price_per_unit DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (snack_id) REFERENCES snacks(id)
      )
    `);

    // Create snack_inventory_tracking table
    db.run(`
      CREATE TABLE IF NOT EXISTS snack_inventory_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snack_id INTEGER,
        week_start_date DATE NOT NULL,
        initial_quantity INTEGER NOT NULL,
        wasted_quantity INTEGER DEFAULT 0,
        shortage_quantity INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (snack_id) REFERENCES snacks(id)
      )
    `);

    // Check for super admin
    db.get('SELECT id FROM users WHERE is_super_admin = 1', [], (err, row) => {
      if (err) {
        console.error('Error checking for super admin:', err);
        return;
      }

      if (!row) {
        // Create super admin if doesn't exist
        db.run(
          'INSERT INTO users (name, email, password, is_admin, is_super_admin) VALUES (?, ?, ?, ?, ?)',
          ['Super Admin', 'superadmin@snackup.com', 'superadmin123', 1, 1],
          (err) => {
            if (err) {
              console.error('Error creating super admin:', err);
            } else {
              console.log('Super admin created successfully');
            }
          }
        );
      }
    });
  });

  return db;
};

module.exports = initDatabase; 