const express = require("express");
const path = require("path");
const dashboardRoutes = require("./routes/dashboard");
const dashboardSearchRoutes = require("./routes/dashboardSearch");

function startWebServer() {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  // Set EJS
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  // Dashboard routes
  app.use("/dashboard", dashboardRoutes);
  app.use("/dashboard/search", dashboardSearchRoutes);

  return app;
}

module.exports = { startWebServer };

