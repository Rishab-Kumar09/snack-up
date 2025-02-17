const initDatabase = require('./init');

let db = null;

const getDatabase = async () => {
  if (!db) {
    db = await initDatabase();
  }
  return db;
};

module.exports = getDatabase; 