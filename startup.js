require('dotenv').config();

const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');
const sotwRoleEndpoint = require('./endpoints/sotw-role');
const sessionsEndpointFactory = require('./endpoints/sessions');

async function main() {
  try {
    console.log('🚀 Starting MochiBot...');

    // Start Discord bot
    const client = await startBot();
    console.log('✅ Discord bot connected as', client.user.tag);

    // Start Express web server
    const app = await startWebServer();
    console.log('✅ Web server running');

    // Register endpoints
    sotwRoleEndpoint(app, client);
    const sessionsEndpoint = sessionsEndpointFactory(client);
    app.use('/sessions', sessionsEndpoint);

    console.log('✅ All endpoints registered');
    console.log('🎉 MochiBot is fully running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1); // ensures Render sees the error
  }
}

main();

