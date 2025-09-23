// startup.js
require('dotenv').config();

const { startBot } = require('./bot/client');
const { startWebServer } = require('./web/server');

async function main() {
  try {
    // Start Discord bot
    await startBot();

    // Start Express web server
    await startWebServer();

    console.log('✅ MochiBot is running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();
