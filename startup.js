const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  // ----------------------------
  // Load Secret File (.env)
  // ----------------------------
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  if (process.env.COOKIE) {
    console.log('✅ Cookie loaded successfully (Starts with: ' + process.env.COOKIE.substring(0, 15) + '...)');
  } else {
    console.warn('⚠️  Warning: COOKIE not found in .env file. Ranking will fail.');
  }

  // ----------------------------
  // Initialize Express App FIRST
  // (Render needs to detect the port quickly or it will fail)
  // ----------------------------
  const app = express();

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
  // Core Routes
  // ----------------------------
  app.use('/maintenance', require('./endpoints/maintenance'));
  app.use('/activity', require('./endpoints/activity'));
  app.use('/shifts', require('./endpoints/shifts'));
  app.use('/dashboard', require('./web/routes/dashboard'));
  app.use('/loginpage', require('./web/loginpage/routes'));
  app.use('/settings', require('./endpoints/settings'));
  app.use('/verification', require('./endpoints/verification'));
  app.use('/ranking', require('./endpoints/ranking'));

  app.get('/', (req, res) => res.redirect('/dashboard'));

  // Health route (available immediately, even before bot connects)
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: global.discordClient ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  });

  // ----------------------------
  // Start Server IMMEDIATELY
  // (must happen before bot login so Render detects the port)
  // ----------------------------
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
  });

  // ----------------------------
  // Start Discord Bot (after server is already listening)
  // ----------------------------
  let client = null;
  try {
    client = await startBot();
    global.discordClient = client;
    console.log('✅ Discord bot successfully connected');
  } catch (err) {
    console.error('⚠️  Discord bot failed to start:', err.message);
    console.log('📝 Server will continue without Discord integration');
    console.log('   Routes /sessions and /sotw-role will be unavailable\n');
  }

  // ----------------------------
  // Discord-dependent Routes
  // (registered after bot attempt, gracefully handled either way)
  // ----------------------------
  if (client) {
    app.use('/sessions', require('./endpoints/sessions')(client));
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));
  } else {
    app.use(['/sessions', '/sotw-role'], (_, res) =>
      res.status(503).json({ error: 'Discord bot not available' })
    );
  }

  // ----------------------------
  // 404 & Error Handlers
  // ----------------------------
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(err.status || 500).json({ error: 'Internal Server Error' });
  });

  // ----------------------------
  // DB Polling for Verification Notifications
  // ----------------------------
  const db = require('./endpoints/database');

  async function pollAndNotify() {
    try {
      const pending = await db.getPendingNotifications();
      for (const row of pending) {
        const { discord_id: discordId, one_time_token: token, claimed_by_username: username, token_expires_at: tokenExpires } = row;

        try {
          if (client) {
            const user = await client.users.fetch(discordId);
            if (user) {
              const embed = {
                title: '✅ Verification Complete',
                description: `Roblox user **${username}** has claimed your verification code.`,
                color: 0x3498db,
                fields: [
                  { name: '🔑 One-Time Password', value: `\`${token}\``, inline: false },
                  { name: '⏰ Expires', value: `${new Date(tokenExpires).toLocaleString()}`, inline: true },
                  { name: '🌐 Login Link', value: '[Mochi Bar Staff Dashboard](https://cuse-k2yi.onrender.com/loginpage/login)', inline: true }
                ],
                thumbnail: { url: 'https://i.imgur.com/your-logo.png' },
                footer: { text: '⚠️ Important: Save this password immediately after logging in!' },
                timestamp: new Date().toISOString()
              };
              await user.send({ embeds: [embed] });
            }
          }
          await db.markRequestNotified(row.id);
        } catch (dmErr) {
          console.warn('Failed to DM user', discordId, dmErr);
        }
      }
    } catch (err) {
      console.error('pollAndNotify error', err);
    }
  }

  setInterval(pollAndNotify, 5000);

  // ----------------------------
  // Audit Log Monitor
  // ----------------------------
  if (client) {
    console.log('🚀 Audit Log Monitor Initializing...');
    setInterval(() => {
      checkAuditLogs(client, '35807738');
    }, 20000);
  }

  // ----------------------------
  // Graceful Shutdown
  // ----------------------------
  const shutdown = () => {
    console.log('🛑 Shutting down...');
    if (client) client.destroy();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
