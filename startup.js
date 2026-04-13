const express = require('express');
const path = require('path');
const session = require('express-session');
const { startBot } = require('./bot/client');
const { checkAuditLogs } = require('./bot/auditMonitor');
const db = require('./endpoints/database');

async function main() {
  // 1. Environment & Secrets
  require('dotenv').config({ path: '/etc/secrets/.env' });
  if (!process.env.DISCORD_TOKEN) {
    require('dotenv').config({ path: path.join(__dirname, '.env') });
  }

  console.log('─────────────────────────────────────');
  console.log('🔍 Environment Check:');
  console.log('   DISCORD_TOKEN :', process.env.DISCORD_TOKEN ? '✅ Loaded' : '❌ MISSING');
  console.log('   SUPABASE_KEY  :', process.env.SUPABASE_KEY  ? '✅ Loaded' : '❌ MISSING');
  console.log('─────────────────────────────────────');

  // 2. Database Resilience Loop (Modified to be less aggressive)
  let dbAwake = false;
  let dbRetries = 5;
  while (!dbAwake && dbRetries > 0) {
    try {
      console.log(`📡 Testing Supabase connection... (${6 - dbRetries}/5)`);
      await db.getPlayerByRobloxId(1);
      dbAwake = true;
      console.log('✅ Database is Awake');
    } catch (err) {
      dbRetries--;
      if (dbRetries === 0) {
        console.error('❌ Could not connect to DB. Exiting.');
        process.exit(1);
      }
      console.log('⏳ Supabase warming up... waiting 10s...');
      await new Promise(res => setTimeout(res, 10000));
    }
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

  // 4. Safe Bot Setup (The "Gentle" way)
  let client = null;
  
  async function connectBot(attempt = 1) {
    try {
      console.log(`🤖 Discord login attempt #${attempt}...`);
      const botClient = await startBot();
      
      // Inject routes once connected
      app.use('/sessions', require('./endpoints/sessions')(botClient));
      app.use('/sotw-role', require('./endpoints/sotw-role')(botClient));
      
      console.log('✅ Discord bot successfully connected');
      return botClient;
    } catch (err) {
      console.error(`❌ Bot failed to start (Attempt ${attempt}):`, err.message);
      
      // If we hit a rate limit (429 or 1015), wait much longer
      const delay = attempt * 30000; // 30s, then 60s, then 90s...
      console.log(`⏳ Waiting ${delay/1000}s before retrying to respect Discord...`);
      
      await new Promise(r => setTimeout(r, delay));
      return connectBot(attempt + 1);
    }
  }

  // Start the connection process without blocking the web server
  connectBot().then(botInstance => {
    client = botInstance;
    global.discordClient = client;

    // 5. Background Tasks (Only start if client is valid)
    console.log('🚀 Starting Background Monitors...');

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
                  { name: '🌐 Login', value: '[Mochi Bar](https://mochibar.onrender.com/loginpage/login)' }
                ]
              }]
            }).catch(() => console.log(`Could not DM user ${row.discord_id}`));
            
            await db.markRequestNotified(row.id);
            // Throttle DMs to avoid being flagged for spam
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      } catch (err) {
        console.error('Poll error:', err.message);
      }
    }, 60000); // Increased to 60s for safety

    setInterval(() => {
      if (client?.isReady()) checkAuditLogs(client, '35807738');
    }, 120000);
  });

  // 6. Graceful Shutdown
  const shutdown = () => {
    console.log('🛑 Shutting down...');
    if (client) client.destroy();
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  // Keep the process alive for a bit so logs can be read
  setTimeout(() => process.exit(1), 5000);
});
