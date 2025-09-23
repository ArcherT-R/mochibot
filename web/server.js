// src/web/server.js
const express = require('express');
const session = require('express-session');
const path = require('path');

const PORT = process.env.PORT || 3000;
const VIEWS_PATH = path.join(__dirname, '../../views');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false,
}));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', VIEWS_PATH);

// Routes (we’ll add files under src/web/routes/)
app.get('/', (req, res) => res.redirect('/dashboard'));

function startWebServer() {
  return new Promise(resolve => {
    app.listen(PORT, () => {
      console.log(`🌐 Express listening on port ${PORT}`);
      resolve();
    });
  });
}

module.exports = { app, startWebServer };
