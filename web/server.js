const express = require('express');
const PORT = process.env.PORT || 3000;

// Set server start time
global.startTime = Date.now();
global.requestsToday = 0;
global.incidentsToday = 0;

function startWebServer() {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());

    // Root dashboard
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MochiBot Dashboard</title>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; background: #9ee0ff; text-align: center; padding: 20px; }
            .title-box {
              background: #61bfe6;
              padding: 20px;
              border-radius: 20px;
              max-width: 800px;
              margin: 0 auto;
              font-size: 20px;
            }
            .container { display: flex; justify-content: space-around; margin-top: 30px; gap: 20px; flex-wrap: wrap; }
            .card {
              background: #61bfe6;
              padding: 20px;
              border-radius: 20px;
              width: 200px;
              flex-shrink: 0;
            }
            h1 { margin-bottom: 10px; }
            .big { font-size: 22px; font-weight: bold; }

            /* Mobile-friendly */
            @media (max-width: 600px) {
              .container {
                flex-direction: column;
                align-items: center;
              }
              .card {
                width: 90%;
              }
            }
          </style>
        </head>
        <body>
          <div class="title-box">
            <h1>Welcome to Mochi Bar Bot Online!</h1>
            <p>We store data on our bot, and use it to enhance the experience.</p>
          </div>

          <div class="container">
            <div class="card">
              <h3>Uptime:</h3>
              <div class="big" id="hours">0 Hours</div>
              <div class="big" id="minutes">0 Minutes</div>
              <div class="big" id="seconds">0 Seconds</div>
            </div>
            <div class="card">
              <h3>Command Requests Today</h3>
              <div class="big" id="requests">${global.requestsToday} Requests</div>
            </div>
            <div class="card">
              <h3>Incidents</h3>
              <div class="big" id="incidents">${global.incidentsToday} Incidents</div>
            </div>
          </div>

          <script>
            const startTime = ${global.startTime};

            function updateTimer() {
              const now = Date.now();
              let diff = Math.floor((now - startTime) / 1000);
              const hours = Math.floor(diff / 3600);
              diff %= 3600;
              const minutes = Math.floor(diff / 60);
              const seconds = diff % 60;

              document.getElementById('hours').textContent = hours + " Hours";
              document.getElementById('minutes').textContent = minutes + " Minutes";
              document.getElementById('seconds').textContent = seconds + " Seconds";
            }

            setInterval(updateTimer, 1000);
            updateTimer();
          </script>
        </body>
        </html>
      `);
    });

    app.listen(PORT, () => {
      console.log(`🌐 Web server running on port ${PORT}`);
      resolve(app);
    });
  });
}

module.exports = { startWebServer };