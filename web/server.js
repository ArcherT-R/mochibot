const express = require('express');
const PORT = process.env.PORT || 3000;

function startWebServer() {
  return new Promise(resolve => {
    const app = express();
    app.use(express.json());

    // Root dashboard
    app.get('/', (req, res) => {
      const uptimeMs = Date.now() - global.startTime;
      const uptimeSec = Math.floor(uptimeMs / 1000);

      // Build initial HTML
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MochiBot Dashboard</title>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; background: #9ee0ff; text-align: center; padding: 20px; }
            .container { display: flex; justify-content: space-around; margin-top: 30px; }
            .card { background: #61bfe6; padding: 20px; border-radius: 20px; width: 200px; }
            h1 { background: #61bfe6; padding: 20px; border-radius: 20px; }
            .big { font-size: 24px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Welcome to Mochi Bar Bot Online!</h1>
          <p>We store data on our bot, and use it to enhance the experience.</p>

          <div class="container">
            <div class="card">
              <h3>Uptime:</h3>
              <div class="big" id="uptime">Loading...</div>
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
              document.getElementById('uptime').textContent =
                hours + " Hours " + minutes + " Minutes " + seconds + " Seconds";
            }

            // Update uptime every second
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
