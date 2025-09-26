const client = require("./client"); // your Discord client
const app = require("./web/server");

// Import endpoints
const sessionsRoute = require("./endpoints/sessions");

// Mount /sessions with client
app.use("/sessions", sessionsRoute(client));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web dashboard running on port ${PORT}`);
});
