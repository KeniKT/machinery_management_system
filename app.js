const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');
const methodOverride = require('method-override');

const app = express();
const PORT = 3000;

// Configure middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
  res.render('landing');
});

// Login routes
app.get('/login', (req, res) => {
  res.render('login', { 
    error: null,
    role: 'admin'
  });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await new Promise((resolve, reject) => {
      db.getUserByUsername(username, (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });

    if (!user) {
      return res.render('login', {
        error: 'Invalid credentials',
        role: 'admin'
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('login', {
        error: 'Invalid credentials',
        role: 'admin'
      });
    }

    // Session setup
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Redirect to home
    res.redirect('/home');

  } catch (err) {
    console.error('Login error:', err);
    res.render('login', {
      error: 'Server error',
      role: 'admin'
    });
  }
});

// Home route
app.get('/home', isAuthenticated, (req, res) => {
  res.render('home', {
    username: req.session.username,
    role: req.session.role
  });
});

// Machine routes
app.get('/machines', isAuthenticated, (req, res) => {
  db.getAllMachinesFull((err, machines) => {
    if (err) {
      console.error('Machine retrieval error:', err);
      return res.status(500).send('Error retrieving machines');
    }
     res.render('index', { machines }); 
  });
});

// Maintenance routes
app.get('/maintenance', isAuthenticated, (req, res) => {
  db.getAllMaintenanceRecords((err, maintenanceRecords) => {
    if (err) {
      console.error('Maintenance records error:', err);
      return res.status(500).send('Error retrieving records');
    }
    db.getAllMachines((err, machines) => {
      if (err) {
        console.error('Machines retrieval error:', err);
        return res.status(500).send('Error retrieving machines');
      }
      res.render('maintenance', { maintenanceRecords, machines });
    });
  });
});

// Show new maintenance form
app.get('/maintenance/new', isAuthenticated, (req, res) => {
  db.getAllMachines((err, machines) => {
    if (err) {
      console.error('Machines retrieval error:', err);
      return res.status(500).send('Error retrieving machines');
    }
    res.render('new_maintenance', { machines });
  });
});

// Handle maintenance form submission
app.post('/maintenance/add', isAuthenticated, (req, res) => {
  const { machine_id, date, description, performed_by } = req.body;
  db.addMaintenance(machine_id, date, description, performed_by, (err) => {
    if (err) {
      console.error('Error adding maintenance:', err);
      return res.status(500).send('Error adding maintenance record');
    }
    res.redirect('/maintenance');
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destruction error:', err);
    res.redirect('/login');
  });
});

// This should already be in your code
app.post('/machines/add', isAuthenticated, (req, res) => {
  const { name, type, status } = req.body;
  db.addMachine(name, type, status, (err) => {
    if (err) {
      console.error('Error adding machine:', err);
      return res.status(500).send('Error adding machine');
    }
    res.redirect('/machines');
  });
});
// Add this route to handle displaying the form
app.get('/machines/new', isAuthenticated, (req, res) => {
  res.render('new');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <div style="text-align: center; padding: 50px;">
      <h1>Page not found</h1>
      <a href="/home" style="margin-top: 20px; display: inline-block;">
        Return to Dashboard
      </a>
    </div>
  `);
});



// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});