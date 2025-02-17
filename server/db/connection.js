const initDatabase = require('./init');

let db = null;

// Initialize database synchronously
try {
  db = initDatabase();
  console.log('Database connection initialized');
} catch (err) {
  console.error('Error initializing database:', err);
  process.exit(1);
}

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = getDatabase; 