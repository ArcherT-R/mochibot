const express = require('express');
const path = require('path');
const session = require('express-session');
const axios = require('axios'); // Add axios for pre-flight checks
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

  // 🛡️ ANTI-1015 PRE-FLIGHT CHECK
  // Check if the current Render IP is already banned before even trying to login
  try {
    console.log('🌐 Checking Discord API reachability...');
    await axios.get('https://discord.com/api/v10/gateway', { timeout: 5000 });
    console.log('✅ Network path to Discord is clear.');
  } catch (err) {
    if (err.response && err.response.status === 429) {
      console.error('❌ CRITICAL: This Render IP is already 1015 rate-limited by Discord.');
      console.error('🛑 Stopping to avoid worsening the ban. Create a NEW service in a different region.');
      process.exit(1); 
    }
    console.warn('⚠️ Could not verify Discord reachability, proceeding with caution...');
  }

  // 2. Database Resilience Loop
  let dbAwake = false;
  let dbRetries = 5;
  while (!dbAwake && dbRetries > 0) {
    try {
      console.log(`📡 Testing Supabase connection... (Attempt ${6 - dbRetries}/5)`);
      await db.getPlayerByRobloxId(1); 
      dbAwake = true;
      console.log('✅ Database is Awake');
    } catch (err) {
      dbRetries--;
      if (dbRetries === 0) process.exit(1);
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
    res.json({ status: 'healthy', discord: global.discordClient?.isReady() ? 'connected' : 'connecting' });
  });

  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Web Server running on port ${PORT}`);
  });

  // 4. Safe Bot Setup
  let client = null;
  try {
    console.log('🤖 Attempting Discord login...');
    // Add a small 2-second delay before login to let the network stabilize
    await new Promise(r => setTimeout(r, 2000));
    
    client = await startBot(); 
    global.discordClient = client;

    console.log('✅ Discord bot successfully connected');

    // 5. Dynamic Route Injection
    app.use('/sessions', require('./endpoints/sessions')(client));
    app.use('/sotw-role', require('./endpoints/sotw-role')(client));

    // 6. Background Tasks (Polished Intervals)
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
            });
            await db.markRequestNotified(row.id);
            await new Promise(r => setTimeout(r, 2000)); // Increased to 2s delay
          }
        }
      } catch (err) {
        console.error('Poll error:', err.message);
      }
    }, 45000); // Increased to 45s to reduce total API calls

    setInterval(() => {
      if (client?.isReady()) checkAuditLogs(client, '35807738');
    }, 120000); // Increased to 2 mins

  } catch (err) {
    console.error('❌ Discord bot failed to start:', err.message);
    process.exit(1); 
  }

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
