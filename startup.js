const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');
const session = require('express-session');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  // 1. Initialize Express App First
  const app = express();
  let client = null;

  // ----------------------------
  // Middleware & Session
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
  // Core Routes (Always Available)
  // ----------------------------
  app.use('/maintenance', require('./endpoints/maintenance'));
  app.use('/activity', require('./endpoints/activity'));
  app.use('/shifts', require('./endpoints/shifts'));
  app.use('/dashboard', require('./web/routes/dashboard'));
  app.use('/loginpage', require('./web/loginpage/routes'));
  app.use('/settings', require('./endpoints/settings'));
  app.use('/verification', require('./endpoints/verification'));
  app.use('/ranking', require('./endpoints/ranking'));

  // ----------------------------
  // Dynamic Discord Routes
  // ----------------------------
  // We use a middleware to check if the bot is ready yet
  const ensureBot = (req, res, next) => {
    if (client && client.isReady()) return next();
    res.status(503).json({ error: 'Discord bot is still starting up... try again in 10 seconds.' });
  };

  app.use('/sessions', ensureBot, (req, res, next) => require('./endpoints/sessions')(client)(req, res, next));
  app.use('/sotw-role', ensureBot, (req, res, next) => require('./endpoints/sotw-role')(client)(req, res, next));

  app.get('/', (req, res) => res.redirect('/dashboard'));

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: (client && client.isReady()) ? 'connected' : 'connecting/disconnected',
      uptime: process.uptime()
    });
  });

  // ----------------------------
  // 2. START SERVER IMMEDIATELY
  // ----------------------------
  // Render needs to see this port open within 60 seconds
  const PORT = process.env.PORT || 10000; 
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Render Detection Success! Server running on port ${PORT}`);
  });

  // ----------------------------
  // 3. Start Discord Bot in Background
  // ----------------------------
  startBot()
    .then(botClient => {
      client = botClient;
      console.log('✅ Discord bot successfully connected');
      
      // Initialize Audit Log Monitor
      console.log("🚀 Audit Log Monitor Initializing...");
      setInterval(() => {
        checkAuditLogs(client, '35807738');
      }, 20000);

      // Start the DB polling
      const db = require('./endpoints/database');
      setInterval(() => pollAndNotify(client, db), 5000);
    })
    .catch(err => {
      console.error('⚠️ Discord bot failed to start:', err.message);
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

// Helper function moved outside to keep main clean
async function pollAndNotify(client, db) {
  if (!client || !client.isReady()) return;
  try {
    const pending = await db.getPendingNotifications();
    for (const row of pending) {
      try {
        const user = await client.users.fetch(row.discord_id);
        if (user) {
          const embed = {
            title: '✅ Verification Complete',
            description: `Roblox user **${row.claimed_by_username}** has claimed your code.`,
            color: 0x3498db,
            fields: [
              { name: '🔑 Password', value: `\`${row.one_time_token}\``, inline: false },
              { name: '🌐 Login', value: '[Mochi Bar Dashboard](https://cuse-k2yi.onrender.com/loginpage/login)', inline: true }
            ],
            timestamp: new Date().toISOString()
          };
          await user.send({ embeds: [embed] });
        }
        await db.markRequestNotified(row.id);
      } catch (dmErr) {
        console.warn('Failed to DM user', row.discord_id);
      }
    }
  } catch (err) {
    console.error('pollAndNotify error', err);
  }
}

main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
