const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  const app = express();
  let client = null;

  // 1. EXPRESS MIDDLEWARE
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

  // 2. ROUTES
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: (client && client.isReady()) ? 'connected' : 'connecting',
      uptime: process.uptime()
    });
  });

  const botGuard = (req, res, next) => {
    if (client && client.isReady()) return next();
    res.status(503).json({ error: "Discord bot is starting up. Refresh in 10 seconds." });
  };

  app.use('/dashboard', require('./web/routes/dashboard'));
  app.use('/loginpage', require('./web/loginpage/routes'));
  
  // These use a function wrapper so they only load when the bot is ready
  app.use('/sotw-role', botGuard, (req, res, next) => require('./endpoints/sotw-role')(client)(req, res, next));
  app.use('/sessions', botGuard, (req, res, next) => require('./endpoints/sessions')(client)(req, res, next));

  app.get('/', (req, res) => res.redirect('/dashboard'));

  // 3. START SERVER IMMEDIATELY (Fixes Render Port Issue)
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 RENDER PORT DETECTED: ${PORT}`);
    console.log(`🔗 URL: https://cuse-k2yi.onrender.com/sotw-role`);
  });

  // 4. START BOT & BACKGROUND TASKS
  startBot()
    .then(botClient => {
      client = botClient;
      console.log('✅ Discord bot connected successfully');
      
      // Start Audit Logs
      setInterval(() => {
        try { checkAuditLogs(client, '35807738'); } catch (e) { console.error("Audit log error:", e); }
      }, 30000);
      
      // Start Verification Polling (Integrated logic)
      const db = require('./endpoints/database');
      setInterval(async () => {
        if (!client || !client.isReady()) return;
        try {
          const pending = await db.getPendingNotifications();
          for (const row of pending) {
            const user = await client.users.fetch(row.discord_id).catch(() => null);
            if (user) {
              await user.send({
                embeds: [{
                  title: '✅ Verification Complete',
                  description: `Roblox user **${row.claimed_by_username}** claimed your code.`,
                  color: 0x3498db,
                  fields: [
                    { name: '🔑 Password', value: `\`${row.one_time_token}\``, inline: false },
                    { name: '🌐 Login', value: '[Dashboard](https://cuse-k2yi.onrender.com/loginpage/login)', inline: true }
                  ]
                }]
              });
            }
            await db.markRequestNotified(row.id);
          }
        } catch (err) { console.error('Polling error:', err); }
      }, 10000);
    })
    .catch(err => {
      console.error('❌ Bot failed to start:', err.message);
    });

  // Shutdown Logic
  const shutdown = () => {
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
