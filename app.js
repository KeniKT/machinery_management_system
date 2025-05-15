const express = require('express');
const methodOverride = require('method-override');
const session = require('express-session');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Database connection
const db = new sqlite3.Database('./machinery.db');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));

// Session setup
app.use(session({
  secret: 'your_secret_key',  // Change this in production
  resave: false,
  saveUninitialized: false
}));

// View engine
app.set('view engine', 'ejs');

// Create users table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  )
`);

// Seed default admin user if not exists
db.get(`SELECT * FROM users WHERE username = 'admin'`, async (err, user) => {
  if (!user) {
    const hash = await bcrypt.hash('admin123', 10);
    db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, ['admin', hash]);
    console.log('✅ Default admin user created with password "admin123"');
  }
});

// --- Authentication middleware ---
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
}

// --- Routes ---

// Landing page
app.get('/landing', (req, res) => {
  res.render('landing');
});

// Login
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err || !user) {
      return res.render('login', { error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (match) {
      req.session.userId = user.id;
      res.redirect('/home'); // Redirect to home after successful login
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// Root route -> show landing page
app.get('/', (req, res) => {
  res.render('landing');  // Default page for root
});

// Home page after login
app.get('/home', isAuthenticated, (req, res) => {
  res.render('home');  // Requires views/home.ejs
});

// Machines list page
app.get('/machines', isAuthenticated, (req, res) => {
  db.all('SELECT * FROM machines', (err, machines) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.render('index', { machines });
  });
});

// Add machine
app.get('/machines/new', isAuthenticated, (req, res) => {
  res.render('new');
});

app.post('/machines', isAuthenticated, (req, res) => {
  const { name, type, status } = req.body;
  db.run('INSERT INTO machines (name, type, status) VALUES (?, ?, ?)', [name, type, status], (err) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.redirect('/machines');
  });
});

// Edit machine
app.get('/machines/:id/edit', isAuthenticated, (req, res) => {
  const machineId = req.params.id;
  db.get('SELECT * FROM machines WHERE id = ?', [machineId], (err, machine) => {
    if (err || !machine) {
      res.status(404).send('Machine not found');
      return;
    }
    res.render('edit', { machine });
  });
});

app.put('/machines/:id', isAuthenticated, (req, res) => {
  const { name, type, status } = req.body;
  const machineId = req.params.id;
  db.run('UPDATE machines SET name = ?, type = ?, status = ? WHERE id = ?', [name, type, status, machineId], (err) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.redirect('/machines');
  });
});

// Delete machine
app.delete('/machines/:id', isAuthenticated, (req, res) => {
  const machineId = req.params.id;
  db.run('DELETE FROM machines WHERE id = ?', [machineId], (err) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.redirect('/machines');
  });
});

// Maintenance pages
app.get('/maintenance', isAuthenticated, (req, res) => {
  const sql = `
    SELECT m.*, machines.name AS machine_name 
    FROM maintenance m 
    JOIN machines ON m.machine_id = machines.id
  `;
  db.all(sql, (err, maintenanceRecords) => {
    if (err) return res.status(500).send('Database error');
    res.render('maintenance', { maintenanceRecords });
  });
});

app.get('/maintenance/new', isAuthenticated, (req, res) => {
  db.all('SELECT id, name FROM machines', (err, machines) => {
    if (err) return res.status(500).send('Database error');
    res.render('new_maintenance', { machines });
  });
});

app.post('/maintenance', isAuthenticated, (req, res) => {
  const { machine_id, date, description, performed_by } = req.body;
  db.run(`
    INSERT INTO maintenance (machine_id, date, description, performed_by)
    VALUES (?, ?, ?, ?)`,
    [machine_id, date, description, performed_by],
    (err) => {
      if (err) return res.status(500).send('Database error');
      res.redirect('/maintenance');
    }
  );
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
