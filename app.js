const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = 3000;

// Configure middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge:  12 * 60 * 60 * 1000,
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
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render('login', {
        error: 'Invalid credentials',
      });
    }


    // Session setup
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Redirect to home
    res.redirect('/home');
  } catch (err) {
    res.render('login', {
      error: 'Server error',
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

// Add this route to handle displaying the form
app.get('/machines/new', isAuthenticated, (req, res) => {
  res.render('new');
});

// Add new machine
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

// Display edit machine edit page
app.get('/machines/:id/edit', isAuthenticated, (req, res) => {
  console.log("machien id", req.params.id);
  // get machine by id
  db.getMachineById(req.params.id, (err, machine) => {
    if (err) {
      console.error('Machine retrieval error:', err);
      return res.status(500).send('Error retrieving machine');
    }
    res.render('edit', { machine });
  })

});

// Edit machine
app.post('/machines/:id', isAuthenticated, (req, res) => {
  const { name, type, status } = req.body;
  db.updateMachine(req.params.id, name, type, status, (err) => {
    if (err) {
      console.error('Error updating machine:', err);
      return res.status(500).send('Error updating machine');
    }
    res.redirect('/machines');
  });
});

// Delete machine by id
app.delete('/machines/:id', isAuthenticated, (req, res) => {
  db.deleteMachine(req.params.id, (err) => {
    if (err) {
      console.error('Error deleting machine:', err);
      return res.status(500).send('Error deleting machine');
    }
    res.redirect('/machines');
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
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown handler
async function shutdown() {
  try {
    console.log('\nClosing database connection...');
    server.closeAllConnections && server.closeAllConnections();
    await db.closeDatabase();
    console.log('Database connection closed.');
    
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      console.error('Forcing shutdown...');
      process.exit(1);
    }, 5000);
    
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);