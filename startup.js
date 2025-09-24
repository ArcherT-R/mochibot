require('dotenv').config();

const { startBot, client } = require('./bot/client');
const { startWebServer, app } = require('./web/server');

// Endpoints
const sotwRoleEndpoint = require('./endpoints/sotw-role');
// Add other endpoints here if needed, e.g., check-perk, check-staff-otw

async function main() {
  try {
    // Start Express web server
    await startWebServer();

    // Register endpoints
    sotwRoleEndpoint(app, client);
    // e.g., checkPerkEndpoint(app, client);

    // Start Discord bot
    await startBot();

    console.log('✅ MochiBot is running!');

  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();
