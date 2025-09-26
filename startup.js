require('dotenv').config();
const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');

const sotwRoleEndpoint = require('./endpoints/sotw-role'); // your custom endpoint
const sessionsEndpointFactory = require('./endpoints/sessions'); // your custom endpoint factory

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
    sotwRoleEndpoint(app, client); // registers /sotw-role inside this file
    const sessionsEndpoint = sessionsEndpointFactory(client);
    app.use('/sessions', sessionsEndpoint); // mounts /sessions

    console.log('✅ All endpoints registered');
    console.log('🎉 MochiBot is fully running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();

