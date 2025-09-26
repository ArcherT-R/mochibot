const express = require("express");
const path = require("path");

// Import routes
const dashboardRoute = require("./routes/dashboard");
const dashboardSearchRoute = require("./routes/dashboardSearch");

const app = express();

// Views setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/dashboard/search", dashboardSearchRoute);
app.use("/dashboard", dashboardRoute);

// Export app for startup.js
module.exports = app;
