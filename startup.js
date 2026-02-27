const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  // 1. Load Environment Variables
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  const app = express();
  let client = null; // This will hold the bot once it connects

  // ----------------------------
  // 2. EXPRESS CONFIGURATION (DO THIS FIRST)
  // ----------------------------
  app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  }));

  app.set('views', path.join(__dirname, 'web/views'));
  app.set('view engine', 'ejs');
  app.use(express.static(path.join(__dirname, 'web/public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ----------------------------
  // 3. CORE ROUTES (ALWAYS AVAILABLE)
  // ----------------------------
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: (client && client.isReady()) ? 'connected' : 'connecting',
      uptime: process.uptime()
    });
  });

  // Middleware to protect Discord-dependent routes
  const botGuard = (req, res, next) => {
    if (client && client.isReady()) return next();
    res.status(503).json({ error: "Discord bot is starting up. Please refresh in 10 seconds." });
  };

  // Static routes first
  app.use('/dashboard', require('./web/routes/dashboard'));
  app.use('/loginpage', require('./web/loginpage/routes'));
  
  // Discord-dependent routes (Protected by botGuard)
  app.use('/sotw-role', botGuard, (req, res, next) => require('./endpoints/sotw-role')(client)(req, res, next));
  app.use('/sessions', botGuard, (req, res, next) => require('./endpoints/sessions')(client)(req, res, next));

  app.get('/', (req, res) => res.redirect('/dashboard'));

  // ----------------------------
  // 4. OPEN THE PORT (CRITICAL FOR RENDER)
  // ----------------------------
  const PORT = process.env.PORT || 10000; // Render usually uses 10000
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 RENDER PORT DETECTED: ${PORT}`);
    console.log(`🔗 URL: https://cuse-k2yi.onrender.com/sotw-role`);
  });

  // ----------------------------
  // 5. START BOT IN BACKGROUND (NON-BLOCKING)
  // ----------------------------
  console.log("⏳ Initializing Discord Bot...");
  startBot()
    .then(botClient => {
      client = botClient;
      console.log('✅ Discord bot connected successfully');
      
      // Initialize Background Tasks
      if (client) {
        // Start Audit Logs
        setInterval(() => checkAuditLogs(client, '35807738'), 30000);
        
        // Start Verification Polling
        const db = require('./endpoints/database');
        const { pollAndNotify } = require('./utils/notifier'); // Consider moving logic here
        setInterval(() => pollAndNotify(client, db), 10000);
      }
    })
    .catch(err => {
      console.error('❌ Bot failed to start:', err.message);
      console.log('📝 Server running in Web-Only mode.');
    });

  // Graceful Shutdown
  const shutdown = () => {
    console.log('🛑 Shutting down...');
    if (client) client.destroy();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
