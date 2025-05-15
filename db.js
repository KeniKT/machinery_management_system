const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('machinery.db');

// Create users table if it doesn't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create users table:', err);
    } else {
      console.log('✅ Users table is ready.');
    }
  });

  // Seed admin user if not exists
  db.get(`SELECT * FROM users WHERE username = ?`, ['admin'], async (err, row) => {
    if (err) {
      console.error('Error checking admin user:', err);
    } else if (!row) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, ['admin', hashedPassword], (err) => {
        if (err) {
          console.error('Failed to insert admin user:', err);
        } else {
          console.log('✅ Admin user created (username: admin, password: admin123)');
        }
      });
    }
  });
});

module.exports = db;
