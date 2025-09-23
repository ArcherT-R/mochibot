require('dotenv').config();

const { startBot, client } = require('./bot/client');
const { startWebServer } = require('./web/server');

async function main() {
  try {
    // Start Discord bot
    await startBot();

    // Start Express web server and pass bot client for uptime
    await startWebServer(client);

    console.log('✅ MochiBot is running!');
  } catch (err) {
    console.error('❌ Failed to start MochiBot:', err);
    process.exit(1);
  }
}

main();
