// web/server.js
const express = require('express');
const path = require('path');
require('dotenv').config();

const dashboardRoutes = require('./routes/dashboard');

const app = express();

// EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Public assets
app.use(express.static(path.join(__dirname, 'public')));

// Routes (everything is under /dashboard)
app.use('/dashboard', dashboardRoutes);

const PORT = process.env.WEB_PORT || 4000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on http://localhost:${PORT}/dashboard`);
});
