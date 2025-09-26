const express = require("express");
const path = require("path");

// Import routes
const dashboardRoute = require("./routes/dashboard");
const dashboardSearchRoute = require("./routes/dashboardSearch");
const sessionsRoute = require("./routes/sessions"); // if needed
// const sotwRoleRoute = require("./routes/sotw-role"); // if needed

const app = express();

// Views setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/dashboard/search", dashboardSearchRoute);
app.use("/dashboard", dashboardRoute);
// app.use("/sessions", sessionsRoute);
// app.use("/sotw-role", sotwRoleRoute);

// Start server on Render's port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on port ${PORT}`);
});

module.exports = app;
