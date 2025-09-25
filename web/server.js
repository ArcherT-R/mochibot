const express = require('express');

const PORT = process.env.PORT || 3000;

// Example counters (you should wire these to your bot’s globals)
let requestsToday = 42;
let incidentsToday = 3;

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return { h, m, s };
}

function startWebServer() {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());

    // Root route (Dashboard page)
    app.get('/', (req, res) => {
      const uptime = formatTime(process.uptime());

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MochiBot Status</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #a8ddf5;
              margin: 0;
              padding: 20px;
              text-align: center;
            }
            .container {
              max-width: 900px;
              margin: auto;
            }
            .header {
              background: #6fbcd4;
              padding: 20px;
              border-radius: 20px;
              font-size: 22px;
              font-weight: bold;
            }
            .grid {
              display: flex;
              justify-content: space-around;
              margin-top: 30px;
              gap: 20px;
            }
            .card {
              flex: 1;
              background: #5aaed1;
              padding: 20px;
              border-radius: 20px;
              color: black;
              font-weight: bold;
            }
            .card h2 {
              margin: 10px 0;
              font-size: 20px;
            }
            .big {
              font-size: 26px;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              Welcome to Mochi Bar Bot Online!<br>
              We store data on our bot, and use it to enhance the experience
            </div>
            <div class="grid">
              <div class="card">
                <h2>Uptime</h2>
                <div class="big">${uptime.h} Hours<br>${uptime.m} Minutes<br>${uptime.s} Seconds</div>
              </div>
              <div class="card">
                <h2>Command Requests Today</h2>
                <div class="big">${requestsToday} Requests</div>
              </div>
              <div class="card">
                <h2>Incidents</h2>
                <div class="big">${incidentsToday} Incidents</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    });

    // Health check
    app.get('/health', (req, res) => res.send('Bot is running!'));

    // Start listening
    app.listen(PORT, () => {
      console.log(`🌐 Web server running on port ${PORT}`);
      resolve(app);
    });
  });
}

module.exports = { startWebServer };
