// startup.js
const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Import web routes
const dashboardRoute = require("./web/routes/dashboard");
const dashboardSearchRoute = require("./web/routes/dashboardSearch");
const sessionsRoute = require("./endpoints/sessions"); // pass client
const sotwRoleRoute = require("./endpoints/sotw-role"); // should export a function taking client

// Initialize Express app
const app = express();

// Views setup
app.set("views", path.join(__dirname, "web/views"));
app.set("view engine", "ejs");

// Serve static files
app.use(express.static(path.join(__dirname, "web/public")));

// Routes
app.use("/dashboard/search", dashboardSearchRoute);
app.use("/dashboard", dashboardRoute);
app.use("/sessions", sessionsRoute(client)); // pass Discord client
app.use("/sotw-role", sotwRoleRoute(client)); // pass Discord client if needed

// Root route
app.get("/", (req, res) => {
  res.redirect("/dashboard"); // redirect base to dashboard
});

// Start Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on port ${PORT}`);
});

// Start Discord bot
client.once("ready", () => {
  console.log(`✅ Discord bot connected as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
