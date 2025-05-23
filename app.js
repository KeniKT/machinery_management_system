const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const db = require("./db");
const path = require("path");

const app = express();
const PORT = 3000;

// Configure middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      maxAge: 12 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "strict",
    },
  })
);

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) return next();
  res.redirect("/login");
};

// Routes
app.get("/", (req, res) => {
  res.render("landing");
});

// Login routes
app.get("/login", (req, res) => {
  res.render("login", {
    error: null,
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await new Promise((resolve, reject) => {
      db.getUserByUsername(username, (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });

    if (!user) {
      return res.render("login", {
        error: "Invalid credentials",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.render("login", {
        error: "Invalid credentials",
      });
    }

    // Session setup
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Redirect to home
    if (user.role === "admin") {
       res.redirect("/home");
    } else {
      res.redirect("/tasks")
    }
   
  } catch (err) {
    res.render("login", {
      error: "Server error",
    });
  }
});


app.get("/home", isAuthenticated, (req, res) => {
  db.getDashboardStats((err, stats) => {
    if (err) {
      console.error("Error fetching dashboard stats:", err);
      return res.status(500).send("Internal Server Error");
    }

    res.render("home", {
      username: req.session.username,
      role: req.session.role,
      activePage: "home",
      stats, // pass the stats to the view
    });
  });
});

// Machine routes
app.get("/machines", isAuthenticated, (req, res) => {
  db.getAllMachinesFull((err, machines) => {
    if (err) {
      console.error("Machine retrieval error:", err);
      return res.status(500).send("Error retrieving machines");
    }
    res.render("index", {
      machines,
      activePage: "machines",
      role: req.session.role,
    });
  });
});

// Add this route to handle displaying the form
app.get("/machines/new", isAuthenticated, (req, res) => {
  res.render("new");
});

// Add new machine
app.post("/machines/add", isAuthenticated, (req, res) => {
  const { name, type, model } = req.body;
  db.addMachine(name, type, model, (err) => {
    if (err) {
      console.error("Error adding machine:", err);
      return res.status(500).send("Error adding machine");
    }
    res.redirect("/machines");
  });
});

// Display edit machine edit page
app.get("/machines/:id/edit", isAuthenticated, (req, res) => {
  console.log("machien id", req.params.id);
  // get machine by id
  db.getMachineById(req.params.id, (err, machine) => {
    if (err) {
      console.error("Machine retrieval error:", err);
      return res.status(500).send("Error retrieving machine");
    }
    res.render("edit", { machine });
  });
});

// Edit machine
app.post("/machines/:id", isAuthenticated, (req, res) => {
  const { name, type, model } = req.body;
  db.updateMachine(req.params.id, name, type, model, (err) => {
    if (err) {
      console.error("Error updating machine:", err);
      return res.status(500).send("Error updating machine");
    }
    res.redirect("/machines");
  });
});

app.post("/machines/delete/:id", isAuthenticated, (req, res) => {
  console.log("Delete machine", req.params.id);
  db.deleteMachine(req.params.id, (err) => {
    if (err) {
      console.error("Error deleting machine:", err);
      return res.status(500).send("Error deleting machine");
    }
    res.redirect("/machines");
  });
});

// Maintenance routes
app.get("/maintenance", isAuthenticated, (req, res) => {
  db.getAllMaintenanceRecords((err, records) => {
    if (err) {
      console.error("Error fetching maintenance records:", err);
      return res.status(500).send("Error retrieving maintenance records");
    }
    res.render("maintenance", {
      maintenanceRecords: records,
      activePage: "maintenance",
      role: req.session.role,
    });
  });
});

// Show new maintenance form
app.get("/maintenance/new", isAuthenticated, (req, res) => {
  db.getAllMachines((err, machines) => {
    if (err) {
      console.error("Machines retrieval error:", err);
      return res.status(500).send("Error retrieving machines");
    }

    db.getAllTechnicians((err, users) => {
      if (err) {
        console.error("Technicians retrieval error:", err);
        return res.status(500).send("Error retrieving technicians");
      }

      console.log("machines: ", machines);
      console.log("users: ", users);

      res.render("new_maintenance", { machines, users });
    });
  });
});
// Handle maintenance form submission
app.post("/maintenance/add", isAuthenticated, (req, res) => {
  const { machine_id, due_date, description, user_id } = req.body;
  db.addMaintenance(machine_id, due_date, description, user_id, (err) => {
    if (err) {
      console.error("Error adding maintenance:", err);
      return res.status(500).send("Error adding maintenance record");
    }
    console.log("Add maintenance success");
    res.redirect("/maintenance");
  });
});

app.get("/maintenance/:id/edit", isAuthenticated, (req, res) => {
  db.getMaintenanceById(req.params.id, (err, maintenance) => {
    if (err) {
      console.error("Maintenance record retrieval error:", err);
      return res.status(500).send("Error retrieving maintenance record");
    }
    db.getAllMachines((err, machines) => {
      if (err) {
        console.error("Machines retrieval error:", err);
        return res.status(500).send("Error retrieving machines");
      }
      db.getAllTechnicians((err, users) => {
        if (err) {
          console.error("Users retrieval error:", err);
          return res.status(500).send("Error retrieving users");
        }
        res.render("edit_maintenance", { maintenance, machines, users });
      });
    });
  });
});

app.post("/maintenance/edit/:id", isAuthenticated, (req, res) => {
  const { machine_id, due_date, description, user_id } = req.body;
  db.updateMaintenance(
    req.params.id,
    machine_id,
    due_date,
    description,
    user_id,
    (err) => {
      if (err) {
        console.error("Error updating maintenance:", err);
        return res.status(500).send("Error updating maintenance record");
      }
      res.redirect("/maintenance");
    }
  );
});

// Delete maintenace by id
app.post("/maintenance/:id", isAuthenticated, (req, res) => {
  db.deleteMaintenance(req.params.id, (err) => {
    if (err) {
      console.error("Error deleting maintenance:", err);
      return res.status(500).send("Error deleting maintenance record");
    }
    res.redirect("/maintenance");
  });
});

// Tasks routes
app.get("/tasks", isAuthenticated, (req, res) => {
  const userId = req.session.userId;
  db.getTasksByUserId(userId, (err, tasks) => {
    if (err) {
      console.error("Tasks retrieval error:", err);
      return res.status(500).send("Error retrieving tasks");
    }
    res.render("tasks", {
      tasks: tasks,
      user: req.session.user,
      activePage: "tasks",
      role: req.session.role,
    });
  });
});

// Edit the status of maintenance to Inprogress
app.post("/tasks/edit/:id", isAuthenticated, (req, res) => {
  db.updateMaintenanceStatus(req.params.id, "In Progress", (err) => {
    if (err) {
      console.error("Error updating maintenance:", err);
      return res.status(500).send("Error updating maintenance record");
    }
    res.redirect("/tasks");
  });
});

// Edit the status of maintenance to Done
app.post("/tasks/done/:id", isAuthenticated, (req, res) => {
  db.updateMaintenanceStatus(req.params.id, "Done", (err) => {
    if (err) {
      console.error("Error updating maintenance:", err);
      return res.status(500).send("Error updating maintenance record");
    }
    res.redirect("/tasks");
  });
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Session destruction error:", err);
    res.redirect("/login");
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
    console.log("\nClosing database connection...");
    server.closeAllConnections && server.closeAllConnections();
    await db.closeDatabase();
    console.log("Database connection closed.");

    server.close(() => {
      console.log("Server stopped");
      process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
      console.error("Forcing shutdown...");
      process.exit(1);
    }, 5000);
  } catch (err) {
    console.error("Shutdown error:", err);
    process.exit(1);
  }
}

// Handle termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
