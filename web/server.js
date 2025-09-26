// web/server.js
const express = require('express');

function startWebServer() {
  return new Promise((resolve, reject) => {
    try {
      const app = express();
      app.use(express.json());

      // Example root route
      app.get('/', (req, res) => {
        res.send('<h1>MochiBot Dashboard</h1><p>Welcome!</p>');
      });

      // Start server on port from env or 4000
      const port = process.env.PORT || 4000;
      app.listen(port, () => {
        console.log(`🌐 Web dashboard running on http://localhost:${port}/dashboard`);
      });

      resolve(app);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { startWebServer }; // <- Must export as an object
