// db.js
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const seedUsers = require("./seed");

const db = new sqlite3.Database("machinery.db");

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`);

// Create machines table
db.run(`
  CREATE TABLE IF NOT EXISTS machines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    model TEXT
  )
`);

// Create maintenance table
db.run(`
  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    machine_id INTEGER,
    user_id INTEGER,
    status TEXT,
    due_date TEXT,
    description TEXT,
    FOREIGN KEY (machine_id) REFERENCES machines(id)
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// seed users data from seed.js file and hash passwords before inserting into database
seedUsers.forEach((user) => {
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) throw err;
    // check if user already exists
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [user.username],
      (err, row) => {
        if (!row) {
          db.run(
            "INSERT INTO users (first_name, last_name, username, password, role) VALUES (?, ?, ?, ?, ?)",
            [user.first_name, user.last_name, user.username, hash, user.role]
          );
        }
      }
    );
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

// get machine by id
function getMachineById(id, callback) {
  db.get("SELECT * FROM machines WHERE id = ?", [id], callback);
}

function addMachine(name, type, model, callback) {
  db.run(
    "INSERT INTO machines (name, type, model) VALUES (?, ?, ?)",
    [name, type, model],
    callback
  );
}

function updateMachine(id, name, type, model, callback) {
  db.run(
    "UPDATE machines SET name = ?, type = ?, model = ? WHERE id = ?",
    [name, type, model, id],
    callback
  );
}

function deleteMachine(id, callback) {
  db.run("DELETE FROM machines WHERE id = ?", [id], callback);
}

// === Maintenance Operations ===
function getAllMaintenanceRecords(callback) {
  db.all(
    `
    SELECT 
      maintenance.*, 
      machines.name AS machine_name,
      users.first_name || ' ' || users.last_name AS performed_by
    FROM maintenance
    JOIN machines ON maintenance.machine_id = machines.id
    JOIN users ON maintenance.user_id = users.id
    `,
    callback
  );
}

function addMaintenance(machine_id, due_date, description, user_id, callback) {
  db.run(
    "INSERT INTO maintenance (machine_id, due_date, description, user_id, status) VALUES (?, ?, ?, ?, ?)",
    [machine_id, due_date, description, user_id, "Pending"],
    callback
  );
}

// get maintenance by id
function getMaintenanceById(id, callback) {
  db.get("SELECT * FROM maintenance WHERE id = ?", [id], callback);
}

function updateMaintenance(
  id,
  machine_id,
  date,
  description,
  user_id,
  callback
) {
  db.run(
    "UPDATE maintenance SET machine_id = ?, due_date = ?, description = ?, user_id = ? WHERE id = ?",
    [machine_id, date, description, user_id, id],
    callback
  );
}

function deleteMaintenance(id, callback) {
  db.run("DELETE FROM maintenance WHERE id = ?", [id], callback);
}

// DB requests related to tasks
function getTasksByUserId(userId, callback) {
  // get mentenances and include user with it using userId
  db.all(
    `
    SELECT maintenance.*, machines.name AS machine_name, users.first_name, users.last_name
    FROM maintenance
    JOIN machines ON maintenance.machine_id = machines.id
    JOIN users ON maintenance.user_id = users.id
    WHERE maintenance.user_id = ?
  `,
    [userId],
    callback
  );
}

function getAllTechnicians(callback) {
  db.all("SELECT * FROM users WHERE role = 'technician'", callback);
}

// update maintenance status
function updateMaintenanceStatus(id, status, callback) {
  db.run(
    "UPDATE maintenance SET status = ? WHERE id = ?",
    [status, id],
    callback
  );
}

function getDashboardStats(callback) {
  const stats = {};

  db.get("SELECT COUNT(*) AS total_machines FROM machines", (err, row) => {
    if (err) return callback(err);
    stats.total_machines = row.total_machines;

    db.get("SELECT COUNT(*) AS total_tasks FROM maintenance", (err, row) => {
      if (err) return callback(err);
      stats.total_tasks = row.total_tasks;

      db.get(
        `SELECT 
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'Work in Progress' THEN 1 ELSE 0 END) AS in_progress,
            SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS done
         FROM maintenance`,
        (err, row) => {
          if (err) return callback(err);
          stats.pending = row.pending || 0;
          stats.in_progress = row.in_progress || 0;
          stats.done = row.done || 0;

          db.get(
            "SELECT COUNT(*) AS total_technicians FROM users WHERE role = 'technician'",
            (err, row) => {
              if (err) return callback(err);
              stats.total_technicians = row.total_technicians;

              db.get(
                `SELECT 
                    SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS completed_repairs,
                    SUM(CASE WHEN status = 'Work in Progress' THEN 1 ELSE 0 END) AS active_repairs
                 FROM maintenance`,
                (err, row) => {
                  if (err) return callback(err);
                  stats.completed_repairs = row.completed_repairs || 0;
                  stats.active_repairs = row.active_repairs || 0;

                  callback(null, stats);
                }
              );
            }
          );
        }
      );
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  getUserByUsername,
  getAllMachines,
  getAllMachinesFull,
  getMachineById,
  addMachine,
  updateMachine,
  deleteMachine,
  getAllMaintenanceRecords,
  addMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  getAllTechnicians,
  getTasksByUserId,
  updateMaintenanceStatus,
  getDashboardStats,
  closeDatabase,
};
