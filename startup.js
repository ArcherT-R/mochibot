const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');
const db = require('./endpoints/database'); // Moved up for availability

async function main() {
  // 1. Environment & Secrets
  require('dotenv').config({ path: '/etc/secrets/.env' });
  if (!process.env.DISCORD_TOKEN) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  }

  console.log('─────────────────────────────────────');
  console.log('🔍 Environment Check:');
  console.log('   DISCORD_TOKEN :', process.env.DISCORD_TOKEN ? '✅ Loaded' : '❌ MISSING');
  console.log('   GUILD_ID      :', process.env.GUILD_ID      ? '✅ Loaded' : '❌ MISSING');
  console.log('   CLIENT_ID     :', process.env.CLIENT_ID     ? '✅ Loaded' : '❌ MISSING');
  console.log('─────────────────────────────────────');

  // ----------------------------
  // 2. Database Health Check (CRITICAL)
  // ----------------------------
  // This prevents the bot from trying to start if Supabase is "sleeping"
  try {
    console.log('📡 Checking Supabase connection...');
    // Assuming your db module has a simple health check or query
    await db.raw('SELECT 1').catch(() => { throw new Error("DB not responding"); });
    console.log('✅ Database is Awake');
  } catch (err) {
    console.error('❌ Supabase is INACTIVE. Please wake it up in the dashboard!');
    // We exit here so Render doesn't just loop a broken app
    process.exit(1);
  }

  // 3. Express Setup
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
      discord: global.discordClient?.isReady() ? 'connected' : 'connecting',
      uptime: process.uptime()
    });
  });

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Web Server running on port ${PORT}`);
  });

  // ----------------------------
  // 4. Safe Bot Setup
  // ----------------------------
  let client = null;
  try {
    console.log('🤖 Attempting Discord login...');
    
    // REMOVED Promise.race. Discord.js handles its own retries/backoff.
    // Crashing at 30s was creating the "Attempt 3000" loop.
    client = await startBot(); 
    global.discordClient = client;

    // Rate Limit Monitoring
    if (client.rest) {
      client.rest.on('response', (request, response) => {
        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining && parseInt(remaining) < 3) {
          console.warn(`📊 [Low RateLimit] ${request.method} ${request.path} | Remaining: ${remaining}`);
        }
      });

      client.rest.on('rateLimited', (info) => {
        console.warn(`⚠️ [RATE LIMITED] Reset in ${info.timeToReset}ms`);
      });
    }

    console.log('✅ Discord bot successfully connected');

    // ----------------------------
    // 5. Post-Login Background Tasks
    // ----------------------------
    // ONLY start these if the client successfully logged in
    app.use('/sessions', require('./endpoints/sessions')(client));
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));

    console.log('🚀 Starting Background Monitors...');
    setInterval(pollAndNotify, 15000); // Relaxed to 15s to save API credits
    setInterval(() => checkAuditLogs(client, '35807738'), 60000); // 60s for stability

  } catch (err) {
    console.error('❌ Discord bot failed to start:', err.message);
    process.exit(1); 
  }

  // Polling Logic (Moved inside main for access to client)
  async function pollAndNotify() {
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
                { name: '🔑 One-Time Password', value: `\`${row.one_time_token}\``, inline: false },
                { name: '🌐 Login Link', value: '[Dashboard](https://cuse-k2yi.onrender.com/loginpage/login)', inline: true }
              ],
              timestamp: new Date().toISOString()
            };

            await user.send({ embeds: [embed] });
            await db.markRequestNotified(row.id);
            await new Promise(r => setTimeout(r, 1000)); // 1s delay between DMs
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

  // Shutdown Logic
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
