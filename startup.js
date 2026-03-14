const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  // ----------------------------
  // 1. Environment & Secrets
  // ----------------------------
  require('dotenv').config({ path: '/etc/secrets/.env' });
  if (!process.env.DISCORD_TOKEN) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  }

  console.log('─────────────────────────────────────');
  console.log('🔍 Environment Check:');
  console.log('   DISCORD_TOKEN :', process.env.DISCORD_TOKEN ? '✅ Loaded' : '❌ MISSING');
  console.log('   GUILD_ID      :', process.env.GUILD_ID      ? '✅ Loaded' : '❌ MISSING');
  console.log('   CLIENT_ID     :', process.env.CLIENT_ID     ? '✅ Loaded' : '❌ MISSING');
  console.log('   COOKIE        :', process.env.COOKIE ? '✅ Loaded' : '⚠️  MISSING');
  console.log('─────────────────────────────────────');

  // ----------------------------
  // 2. Express Setup
  // ----------------------------
  const app = express();
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

  // Routes
  app.use('/maintenance', require('./endpoints/maintenance'));
  app.use('/activity', require('./endpoints/activity'));
  app.use('/shifts', require('./endpoints/shifts'));
  app.use('/dashboard', require('./web/routes/dashboard'));
  app.use('/loginpage', require('./web/loginpage/routes'));
  app.use('/settings', require('./endpoints/settings'));
  app.use('/verification', require('./endpoints/verification'));
  app.use('/ranking', require('./endpoints/ranking'));

  app.get('/', (req, res) => res.redirect('/dashboard'));
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      discord: global.discordClient ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  });

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
  });

  // ----------------------------
  // 3. Rate-Limit Aware Bot Setup
  // ----------------------------
  let client = null;
  try {
    console.log('🤖 Starting Discord bot...');
    client = await Promise.race([
      startBot(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Bot login timed out after 30s')), 30000)
      )
    ]);
    global.discordClient = client;

    // --- ADVANCED HEADER MONITORING (Implementing Discord Support's Advice) ---
    if (client.rest) {
      // 1. Intercept raw HTTP responses to read specific headers
      client.rest.on('response', (request, response) => {
        // Read the exact headers Discord Support asked you to look for
        const scope = response.headers.get('x-ratelimit-scope');
        const bucket = response.headers.get('x-ratelimit-bucket');
        const remaining = response.headers.get('x-ratelimit-remaining');

        // Trigger logs if a scope is provided OR if we are running low on remaining requests (< 3)
        if (scope || (remaining && parseInt(remaining) < 3)) {
          console.log(`\n📊 [API HEADER LOG] -> ${request.method} ${request.path}`);
          if (scope) console.log(`   -> X-RateLimit-Scope: ${scope}`);
          if (bucket) console.log(`   -> X-RateLimit-Bucket: ${bucket}`);
          console.log(`   -> X-RateLimit-Remaining: ${remaining || 'Unknown'}`);
        }
      });

      // 2. Listen for the actual rate limit triggers (Discord.js v14 standard)
      client.rest.on('rateLimited', (info) => {
        console.warn(`\n⚠️ [RATE LIMIT HIT / THROTTLED]`);
        console.warn(`   Scope Check: ${info.global ? 'GLOBAL' : 'ROUTE (Check bucket above for shared/user status)'}`);
        console.warn(`   Route: ${info.route}`);
        console.warn(`   Time to wait: ${info.timeToReset}ms`);
      });
    } else {
      // Fallback just in case you are using an older version of discord.js (v13)
      client.on('rateLimit', (info) => {
        console.warn(`\n⚠️ [RATE LIMIT] Scope: ${info.global ? 'GLOBAL' : 'ROUTE'} | Timeout: ${info.timeout}ms | Path: ${info.path}`);
      });
    }

    console.log('✅ Discord bot successfully connected');
  } catch (err) {
    console.error('⚠️  Discord bot failed to start:', err.message);
  }

  // ----------------------------
  // 4. Dynamic Route Injection
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
  // 5. Optimized Polling (DMs)
  // ----------------------------
  const db = require('./endpoints/database');

  async function pollAndNotify() {
    if (!client) return;
    try {
      const pending = await db.getPendingNotifications();
      for (const row of pending) {
        let user = client.users.cache.get(row.discord_id);
        
        try {
          if (!user) {
            user = await client.users.fetch(row.discord_id);
          }

          if (user) {
            const embed = {
              title: '✅ Verification Complete',
              description: `Roblox user **${row.claimed_by_username}** has claimed your code.`,
              color: 0x3498db,
              fields: [
                { name: '🔑 One-Time Password', value: `\`${row.one_time_token}\``, inline: false },
                { name: '⏰ Expires', value: `${new Date(row.token_expires_at).toLocaleString()}`, inline: true },
                { name: '🌐 Login Link', value: '[Mochi Bar Dashboard](https://cuse-k2yi.onrender.com/loginpage/login)', inline: true }
              ],
              footer: { text: 'Save this password immediately!' },
              timestamp: new Date().toISOString()
            };

            await user.send({ embeds: [embed] });
            await db.markRequestNotified(row.id);

            // Sleep 500ms between DMs (Prevents X-RateLimit-Bucket exhaustion)
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (dmErr) {
          console.warn(`DM failed for ${row.discord_id}:`, dmErr.message);
          if (dmErr.code === 50007) await db.markRequestNotified(row.id);
        }
      }
    } catch (err) {
      console.error('Poll error:', err);
    }
  }

  setInterval(pollAndNotify, 10000);

  // ----------------------------
  // 6. Optimized Audit Monitor
  // ----------------------------
  if (client) {
    console.log('🚀 Audit Log Monitor Initializing...');
    setInterval(() => {
      checkAuditLogs(client, '35807738');
    }, 45000);
  }

  // ----------------------------
  // 7. Error & Shutdown
  // ----------------------------
  app.use((req, res) => res.status(404).json({ error: 'Endpoint not found' }));
  app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

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
