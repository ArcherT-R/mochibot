// web/server.js
const express = require('express');
const path = require('path');

function startWebServer() {
  return new Promise((resolve, reject) => {
    try {
      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      // Serve static files (CSS, JS, images)
      app.use(express.static(path.join(__dirname, 'public')));

      // Example /dashboard route
      app.get('/dashboard', (req, res) => {
        res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
      });

      // Return app for endpoints registration
      resolve(app);

      // Start server on environment PORT or 3000
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`🌐 Web dashboard running on http://localhost:${port}/dashboard`);
      });
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { startWebServer };

