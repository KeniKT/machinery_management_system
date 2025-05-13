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
 // Maintenance table
  db.run(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      machine_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id)
    )
  `);
});

module.exports = db;