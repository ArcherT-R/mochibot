const express = require('express');

const PORT = process.env.PORT || 3000;

function startWebServer() {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());

    // Root route
    app.get('/', (req, res) => {
      res.send(`🤖 MochiBot is running! Uptime: ${process.uptime().toFixed(0)}s`);
    });

    // Health check
    app.get('/health', (req, res) => res.send('Bot is running!'));

    // Start listening
    app.listen(PORT, () => {
      console.log(`🌐 Web server running on port ${PORT}`);
      resolve(app); // resolve app instance so we can register endpoints
    });
  });
}

module.exports = { startWebServer };
