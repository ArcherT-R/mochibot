require("dotenv").config();

const { startBot } = require("./bot/client");
const app = require("./web/server"); // Express app is already running

async function main() {
  try {
    console.log("🚀 Starting MochiBot...");

    // Start Discord bot
    const client = await startBot();
    console.log("✅ Discord bot connected as", client.user.tag);

    console.log("🎉 MochiBot is fully running!");
  } catch (err) {
    console.error("❌ Failed to start MochiBot:", err);
    process.exit(1);
  }
}

main();
