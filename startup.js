const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');
const db = require('./endpoints/database');

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
  console.log('   SUPABASE_KEY  :', process.env.SUPABASE_KEY  ? '✅ Loaded' : '❌ MISSING');
  console.log('─────────────────────────────────────');

  // ----------------------------
  // 2. Database Resilience Loop
  // ----------------------------
  // This prevents the "Inactive" crash by waiting for Supabase to wake up
  let dbAwake = false;
  let dbRetries = 5;

  while (!dbAwake && dbRetries > 0) {
    try {
      console.log(`📡 Testing Supabase connection... (Attempt ${6 - dbRetries}/5)`);
      // Use an existing function to test connectivity
      await db.getPlayerByRobloxId(1); 
      dbAwake = true;
      console.log('✅ Database is Awake and Responding');
    } catch (err) {
      dbRetries--;
      if (dbRetries === 0) {
        console.error('❌ Supabase failed to respond. Please check your service_role key!');
        process.exit(1); 
      }
      console.log('⏳ Supabase warming up or rate-limited... waiting 10s...');
      await new Promise(res => setTimeout(res, 10000));
    }
  }

  // ----------------------------
  // 3. Express Setup
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
    // Removed Promise.race to prevent zombie processes
    client = await startBot(); 
    global.discordClient = client;

    // Advanced Header Monitoring
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
    // 5. Dynamic Route Injection
    // ----------------------------
    app.use('/sessions', require('./endpoints/sessions')(client));
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));

    // ----------------------------
    // 6. Background Tasks (Safe Interval)
    // ----------------------------
    console.log('🚀 Starting Background Monitors...');
    
    // Polling Notifications
    setInterval(async () => {
      if (!client?.isReady()) return;
      try {
        const pending = await db.getPendingNotifications();
        for (const row of pending) {
          const user = await client.users.fetch(row.discord_id).catch(() => null);
          if (user) {
            await user.send({
              embeds: [{
                title: '✅ Verification Complete',
                description: `User **${row.claimed_by_username}** claimed your code.`,
                color: 0x3498db,
                fields: [
                  { name: '🔑 Password', value: `\`${row.one_time_token}\`` },
                  { name: '🌐 Login', value: '[Mochi Bar](https://cuse-k2yi.onrender.com/loginpage/login)' }
                ]
              }]
            });
            await db.markRequestNotified(row.id);
            await new Promise(r => setTimeout(r, 1000)); // 1s safety delay
          }
        }
      } catch (err) {
        console.error('Poll error:', err.message);
      }
    }, 20000); // 20s interval to stay under rate limits

    // Audit Log Monitor
    setInterval(() => {
      checkAuditLogs(client, '35807738');
    }, 60000); 

  } catch (err) {
    console.error('❌ Discord bot failed to start:', err.message);
    process.exit(1); // Kill app to prevent "Attempt 3000" loops
  }

  // 7. Shutdown
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
