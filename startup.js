// startup.js
const express = require("express");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

const dashboardRoute = require("./web/routes/dashboard");
const dashboardSearchRoute = require("./web/routes/dashboardSearch");
const sessionsRoute = require("./endpoints/sessions");
const sotwRoleRoute = require("./endpoints/sotw-role");

const app = express();

app.set("views", path.join(__dirname, "web/views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "web/public")));

// Routes that don't depend on Discord can be mounted immediately
app.use("/dashboard/search", dashboardSearchRoute);
app.use("/dashboard", dashboardRoute);
app.use("/sotw-role", sotwRoleRoute); 

// Root route
app.get("/", (req, res) => {
  res.redirect("/dashboard");
});

const PORT = process.env.PORT || 3000;

// Start server only after Discord client is ready
client.once("ready", () => {
  console.log(`✅ Discord bot connected as ${client.user.tag}`);

  // Mount routes that depend on Discord after ready
  app.use("/sessions", sessionsRoute(client));

  app.listen(PORT, () => {
    console.log(`🌐 Web dashboard running on port ${PORT}`);
  });
});

client.login(process.env.DISCORD_TOKEN);

