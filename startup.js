const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');
const session = require('express-session');

async function main() {
  let client = null;

  // ----------------------------
  // Start Discord Bot (Optional)
  // ----------------------------
  try {
    client = await startBot();
    console.log('✅ Discord bot successfully connected');
  } catch (err) {
    console.error('⚠️  Discord bot failed to start:', err.message);
    console.log('📝 Server will continue without Discord integration');
    console.log('   Routes /sessions and /sotw-role will be unavailable\n');
  }

  // ----------------------------
  // Initialize Express App
  // ----------------------------
  const app = express();

  // ----------------------------
  // Load DB for verification notifications
  // ----------------------------
  const db = require('./endpoints/database');

  // ONLY for verification DMs — nothing else!
  async function pollAndNotify() {
    try {
      const pending = await db.getPendingNotifications();
      for (const row of pending) {
        const discordId = row.discord_id;
        const token = row.one_time_token;
        const username = row.claimed_by_username;
        const tokenExpires = row.token_expires_at;

        try {
          const user = await client.users.fetch(discordId);
          if (user) {
            const embed = {
              title: '✅ Verification Complete',
              description: `Roblox user **${username}** has claimed your verification code.`,
              color: 0x3498db,
              fields: [
                {
                  name: '🔑 One-Time Password',
                  value: `\`${token}\``,
                  inline: false
                },
                {
                  name: '⏰ Expires',
                  value: `${new Date(tokenExpires).toLocaleString()}`,
                  inline: true
                },
                {
                  name: '🌐 Login Link',
                  value: '[Mochi Bar Staff Dashboard](https://cuse-k2yi.onrender.com/loginpage/login)',
                  inline: true
                }
              ],
              thumbnail: {
                url: 'https://i.imgur.com/your-logo.png'
              },
              footer: {
                text: '⚠️ Important: Save this password immediately after logging in!'
              },
              timestamp: new Date().toISOString()
            };

            await user.send({ embeds: [embed] });
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

  // Run only every 5 seconds (verification DMs only)
  setInterval(pollAndNotify, 5000);

  // ----------------------------
  // Session Middleware
  // ----------------------------
  app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
  }));

  // ----------------------------
  // View Engine Setup
  // ----------------------------
  app.set('views', path.join(__dirname, 'web/views'));
  app.set('view engine', 'ejs');

  // ----------------------------
  // Middleware
  // ----------------------------
  app.use(express.static(path.join(__dirname, 'web/public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

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

  // ----------------------------
  // Discord Routes (Only if bot online)
  // ----------------------------
  if (client) {
    app.use('/sessions', require('./endpoints/sessions')(client));
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));
  } else {
    app.use('/sessions', (_, res) =>
      res.status(503).json({ error: 'Discord bot not available' })
    );
    app.use('/sotw-role', (_, res) =>
      res.status(503).json({ error: 'Discord bot not available' })
    );
  }

  // ----------------------------
  // Root Redirect
  // ----------------------------
  app.get('/', (req, res) => {
    res.redirect('/dashboard');
  });

  // Health
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: client ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  });

  // ----------------------------
  // 404 Handler
  // ----------------------------
  app.use((req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      path: req.path,
      method: req.method
    });
  });

  // ----------------------------
  // Global Error Handler
  // ----------------------------
  app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    const dev = process.env.NODE_ENV === 'development';
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: dev ? err.message : 'An error occurred',
      stack: dev ? err.stack : undefined
    });
  });

  // ----------------------------
  // Start Server
  // ----------------------------
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║           Mochi Bar Dashboard Server       ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`Health:    http://localhost:${PORT}/health\n`);
    if (client) console.log('🤖 Discord Routes Enabled\n');
  });

  // ----------------------------
  // Auto-sync (if bot is online)
  // ----------------------------
  if (client) {
    const fetch = require('node-fetch');

    setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${PORT}/sessions/sync`, { method: 'POST' });
        const result = await response.json();
        if (result.added > 0) {
          console.log(`🔄 Auto-sync: ${result.message}`);
        }
      } catch (err) {
        console.error('❌ Auto-sync failed:', err.message);
      }
    }, 5 * 60 * 1000);
  }

  // ----------------------------
  // Graceful Shutdown
  // ----------------------------
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down...');
    if (client) client.destroy();
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    console.log('🛑 Shutting down...');
    if (client) client.destroy();
    server.close(() => process.exit(0));
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', err => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });
}

main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
