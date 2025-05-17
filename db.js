// db.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('machinery.db');

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT
  )
`);

// Create machines table
db.run(`
  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    status TEXT
  )
`);

// Create maintenance table
db.run(`
  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER,
    date TEXT,
    description TEXT,
    performed_by TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
  )
`);

// Insert default admin user if not exists
const defaultAdminPassword = 'admin123';
bcrypt.hash(defaultAdminPassword, 10, (err, hash) => {
  if (err) throw err;
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", [
        'admin',
        hash,
        'admin'
      ]);
    }
  });
});

// === User Authentication ===
function getUserByUsername(username, callback) {
  db.get("SELECT * FROM users WHERE username = ?", [username], callback);
}

// === Machine Operations ===
function getAllMachines(callback) {
  db.all("SELECT * FROM machines", callback);
}

function getAllMachinesFull(callback) {
  db.all("SELECT * FROM machines", callback);
}

function addMachine(name, type, status, callback) {
  db.run("INSERT INTO machines (name, type, status) VALUES (?, ?, ?)", [name, type, status], callback);
}

function updateMachine(id, name, type, status, callback) {
  db.run("UPDATE machines SET name = ?, type = ?, status = ? WHERE id = ?", [name, type, status, id], callback);
}

function deleteMachine(id, callback) {
  db.run("DELETE FROM machines WHERE id = ?", [id], callback);
}

// === Maintenance Operations ===
function getAllMaintenanceRecords(callback) {
  db.all(`
    SELECT maintenance.*, machines.name AS machine_name
    FROM maintenance
    JOIN machines ON maintenance.machine_id = machines.id
  `, callback);
}

function addMaintenance(machine_id, date, description, performed_by, callback) {
  db.run("INSERT INTO maintenance (machine_id, date, description, performed_by) VALUES (?, ?, ?, ?)",
    [machine_id, date, description, performed_by], callback);
}

module.exports = {
  getUserByUsername,
  getAllMachines,
  getAllMachinesFull,
  addMachine,
  updateMachine,
  deleteMachine,
  getAllMaintenanceRecords,
  addMaintenance
};

