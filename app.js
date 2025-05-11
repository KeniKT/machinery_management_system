const express = require('express');
const methodOverride = require('method-override');
const db = require('./db');  // Database connection

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));  // Allows us to use DELETE and PUT

// Set up EJS view engine
app.set('view engine', 'ejs');

// Serve static files (CSS, JS)
app.use(express.static('public'));

// ✅ Home page route
app.get('/', (req, res) => {
  res.render('home');  // This will render views/home.ejs
});

// Machines list page
app.get('/machines', (req, res) => {
  db.all('SELECT * FROM machines', (err, machines) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.render('index', { machines });
  });
});

// Show form to add a new machine
app.get('/machines/new', (req, res) => {
  res.render('new');
});

// Add new machine to the database
app.post('/machines', (req, res) => {
  const { name, type, status } = req.body;
  db.run('INSERT INTO machines (name, type, status) VALUES (?, ?, ?)', [name, type, status], (err) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.redirect('/machines');
  });
});

// Show form to edit an existing machine
app.get('/machines/:id/edit', (req, res) => {
  const machineId = req.params.id;
  db.get('SELECT * FROM machines WHERE id = ?', [machineId], (err, machine) => {
    if (err || !machine) {
      res.status(404).send('Machine not found');
      return;
    }
    res.render('edit', { machine });
  });
});

// Update machine details
app.put('/machines/:id', (req, res) => {
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

// Delete a machine
app.delete('/machines/:id', (req, res) => {
  const machineId = req.params.id;
  db.run('DELETE FROM machines WHERE id = ?', [machineId], (err) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.redirect('/machines');
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
