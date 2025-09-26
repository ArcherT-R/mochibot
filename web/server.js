const express = require("express");
const path = require("path");
const dashboardRouter = require("./routes/dashboard");
const dashboardSearch = require("./routes/dashboard-search");

function startWebServer() {
  return new Promise((resolve, reject) => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.set("view engine", "ejs");
    app.set("views", path.join(__dirname, "views"));
    app.use(express.static(path.join(__dirname, "public")));

    // Dashboard main page
    app.use("/dashboard", dashboardRouter);

    // Dashboard search endpoint
    app.use("/dashboard/search", dashboardSearch);

    app.listen(PORT, () => {
      console.log(`🌐 Web dashboard running on http://localhost:${PORT}/dashboard`);
      resolve(app);
    }).on("error", reject);
  });
}

module.exports = { startWebServer };

