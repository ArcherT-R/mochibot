const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');
const session = require('express-session');
const { checkAuditLogs } = require('./bot/auditMonitor');

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '.env') });

  let client = null;
  const GROUP_ID = '35807738';

  // --- Start Bot & Monitor ---
  try {
    client = await startBot();
    console.log('✅ Discord bot successfully connected');
    
    if (client) {
        // Poll every 30 seconds
        setInterval(() => {
            checkAuditLogs(client, GROUP_ID);
        }, 30000);
    }
  } catch (err) {
    console.error('⚠️ Discord bot failed to start:', err.message);
  }

  const app = express();
  
  // ... (All your existing Express middleware and routes go here) ...
  
  // Standard session setup
  app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  }));

  // ... (Core Routes) ...
  app.use('/ranking', require('./endpoints/ranking'));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
