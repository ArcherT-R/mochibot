const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');
const session = require('express-session');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  // ----------------------------
  // Load Secret File (.env)
  // ----------------------------
  // This looks for the .env file you uploaded to Render Secrets
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  // Safety check to see if the cookie is actually loaded
  if (process.env.COOKIE) {
    console.log('✅ Cookie loaded successfully (Starts with: ' + process.env.COOKIE.substring(0, 15) + '...)');
  } else {
    console.warn('⚠️  Warning: COOKIE not found in .env file. Ranking will fail.');
  }

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

  async function pollAndNotify() {
    try {
      const pending = await db.getPendingNotifications();
      for (const row of pending) {
        const discordId = row.discord_id;
        const token = row.one_time_token;
        const username = row.claimed_by_username;
        const tokenExpires = row.token_expires_at;

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
  app.use('/ranking', require('./endpoints/ranking')); // Your ranking endpoint

  // ----------------------------
  // Discord Routes
  // ----------------------------
  if (client) {
    app.use('/sessions', require('./endpoints/sessions')(client));
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));
  } else {
    app.use(['/sessions', '/sotw-role'], (_, res) =>
      res.status(503).json({ error: 'Discord bot not available' })
    );
  }

  app.get('/', (req, res) => res.redirect('/dashboard'));

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: client ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  });

  // Error Handling
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(err.status || 500).json({ error: 'Internal Server Error' });
  });

  // Start
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
  });

if (client) {
    console.log("🚀 Audit Log Monitor Initializing...");
    
    setInterval(() => {
        // Checking every 30 seconds
        checkAuditLogs(client, '35807738');
    }, 20000); 
  }

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
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
