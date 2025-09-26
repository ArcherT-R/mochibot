const express = require("express");
const path = require("path");

// Create Express app
const app = express();

// Import routes
const dashboardRoute = require("./routes/dashboard");
const dashboardSearchRoute = require("./routes/dashboardSearch");
const sessionsRoute = require('./endpoints/sessions'); // correct path

// Views setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/dashboard/search", dashboardSearchRoute);
app.use("/dashboard", dashboardRoute);
// Pass your Discord client if needed
app.use("/sessions", sessionsRoute(client)); 

// Start server on Render's port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on port ${PORT}`);
});

module.exports = app;

