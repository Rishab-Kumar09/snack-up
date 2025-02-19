const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const getDatabase = () => {
  const dbPath = path.join(__dirname, '../../snackup.db');
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  
  // Enable handling of large text data
  db.run('PRAGMA max_page_count = 2147483646');
  db.run('PRAGMA page_size = 32768');
  
  return db;
};

module.exports = getDatabase; 