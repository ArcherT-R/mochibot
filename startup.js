require('dotenv').config();
const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');
const sotwRoleEndpoint = require('./endpoints/sotw-role');
const sessionsEndpointFactory = require('./endpoints/sessions');

async function main() {
  try {
    // Start Discord bot
    const client = await startBot();

    // Start Express web server and get `app` instance
    const app = await startWebServer();

    // Register endpoints **after bot is ready**
    sotwRoleEndpoint(app, client);
    const sessionsEndpoint = sessionsEndpointFactory(client);
    app.use('/sessions', sessionsEndpoint);

    console.log('✅ MochiBot is running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();
