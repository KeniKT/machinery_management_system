const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./machinery.db');

db.serialize(() => {
  // Create the machines table
  db.run(`
    CREATE TABLE IF NOT EXISTS machines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);
});

module.exports = db;
