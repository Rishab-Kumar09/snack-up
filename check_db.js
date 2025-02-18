const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('snackup.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('Error getting tables:', err);
    return;
  }
  console.log('Tables:', tables);
  
  // Check users table
  db.all("SELECT * FROM users", [], (err, users) => {
    if (err) {
      console.error('Error getting users:', err);
    } else {
      console.log('Users:', users);
    }
    
    // Check companies table
    db.all("SELECT * FROM companies", [], (err, companies) => {
      if (err) {
        console.error('Error getting companies:', err);
      } else {
        console.log('Companies:', companies);
      }
      
      // Close database connection
      db.close();
    });
  });
});
