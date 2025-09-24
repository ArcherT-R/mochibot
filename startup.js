require('dotenv').config();
const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');
const sotwRoleEndpoint = require('./endpoints/sotw-role');
const sessionsEndpoint = require('./endpoints/sessions')(client);
app.use('/sessions', sessionsEndpoint);

async function main() {
  try {
    // Start Discord bot
    const client = await startBot();

    // Start Express web server and get `app` instance
    const app = await startWebServer();

    // Register SOTW endpoint **after bot is ready**
    sotwRoleEndpoint(app, client);

    console.log('✅ MochiBot is running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();

