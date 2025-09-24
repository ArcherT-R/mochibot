// startup.js
require('dotenv').config();
const express = require('express');
const app = express();

const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');

// Import endpoints and pass app + client after bot is ready
const sotwRoleEndpoint = require('./endpoints/sotw-role');

async function main() {
  try {
    // Start Discord bot
    const client = await startBot();

    // Start Express web server
    startWebServer(app); // make sure your web/server.js accepts `app` as parameter

    // Register endpoint properly
    sotwRoleEndpoint(app, client);

    console.log('✅ MochiBot is running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();
