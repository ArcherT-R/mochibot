// startup.js
const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

// Create Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// Import routes
const dashboardRoute = require("./web/routes/dashboard");
const dashboardSearchRoute = require("./web/routes/dashboardSearch");
const sessionsRoute = require("./web/endpoints/sessions");

// Create Express app
const app = express();

// Views setup
app.set("views", path.join(__dirname, "web/views"));
app.set("view engine", "ejs");

// Serve static files
app.use(express.static(path.join(__dirname, "web/public")));

// Mount routes
app.use("/dashboard/search", dashboardSearchRoute(client));
app.use("/dashboard", dashboardRoute(client));
app.use("/sessions", sessionsRoute(client));

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on port ${PORT}`);
});

// Start Discord bot
client.once("ready", () => {
  console.log(`✅ Discord bot connected as ${client.user.tag}`);
});

client.login(process.env.BOT_TOKEN).catch(err => {
  console.error("Failed to login Discord bot:", err);
});
