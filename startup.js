const express = require('express');

function startWebServer() {
  return new Promise(resolve => {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // EJS templates
    app.set('view engine', 'ejs');
    app.set('views', __dirname + '/views');

    // Example: add a simple root route
    app.get('/', (req, res) => {
      res.send('MochiBot Web Server Running');
    });

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🌐 Web dashboard running on http://localhost:${PORT}/dashboard`);
      resolve(app);
    });
  });
}

module.exports = { startWebServer };
