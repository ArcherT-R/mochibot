const express = require('express');

function startWebServer(botClient) {
  return new Promise((resolve) => {
    const app = express();
    const PORT = process.env.PORT || 3000;

    app.get('/', (req, res) => {
      const uptimeSeconds = botClient.uptime ? botClient.uptime / 1000 : 0;
      const uptimeMinutes = Math.floor(uptimeSeconds / 60);
      res.send(`🤖 MochiBot is running! Uptime: ${uptimeMinutes} minutes`);
    });

    app.listen(PORT, () => {
      console.log(`🌐 Website running on port ${PORT}`);
      resolve();
    });
  });
}

module.exports = { startWebServer };

