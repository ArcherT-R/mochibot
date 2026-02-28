const express = require('express');
const path = require('path');
const session = require('express-session');

// This looks for your bot/client.js file - make sure the folder is named 'bot'
const { startBot } = require('./bot/client'); 
const { registerCommandsToGuild } = require('./bot/register');

async function main() {
  // Load the .env secrets
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  const app = express();
  let client = null; // This will hold the bot engine once it starts

  // 1. WEB SERVER SETUP (Express)
  app.use(session({
    secret: process.env.SESSION_SECRET || 'mochi-bar-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  }));

  app.set('views', path.join(__dirname, 'web/views'));
  app.set('view engine', 'ejs');
  app.use(express.static(path.join(__dirname, 'web/public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 2. IMMEDIATE PORT BINDING (For Render)
  // We do this BEFORE the bot starts so Render sees the app is "Live"
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 RENDER PORT DETECTED: ${PORT}`);
    console.log(`🔗 Web Dashboard is live.`);
  });

  // 3. HEALTH CHECK ROUTE
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      bot: (client && client.isReady()) ? 'connected' : 'starting',
      uptime: process.uptime()
    });
  });

  // 4. START THE BOT ENGINE
  console.log("⏳ Initializing Discord Bot...");
  try {
    const botClient = await startBot(); // This calls your client.js
    client = botClient;
    console.log('✅ Discord bot engine is running');

    // 5. REGISTER SLASH COMMANDS
    // This calls your register.js to sync commands to your server
    await registerCommandsToGuild(client);

    // 6. ATTACH BOT-DEPENDENT ROUTES
    // We attach these AFTER the bot is ready so they don't crash
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));
    app.use('/sessions', require('./endpoints/sessions')(client));

    // Start background audit monitoring
    const { checkAuditLogs } = require('./bot/auditMonitor');
    setInterval(() => {
      if (client.isReady()) checkAuditLogs(client, '35807738');
    }, 30000);

  } catch (err) {
    console.error('❌ Bot failed to start:', err.message);
    console.log('📝 Running in Web-Only mode.');
  }

  // Redirect root to dashboard
  app.get('/', (req, res) => res.redirect('/dashboard'));
  app.use('/dashboard', require('./web/routes/dashboard'));
  app.use('/loginpage', require('./web/loginpage/routes'));
}

main().catch(err => {
  console.error('❌ Fatal Startup Error:', err);
  process.exit(1);
});
