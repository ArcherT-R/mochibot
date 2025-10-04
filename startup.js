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

  // in bot startup (after client ready)
const db = require('../../endpoints/database');

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
          await user.send({
            content: `✅ Verification complete!\nRoblox user **${username}** claimed your code.\n` +
                     `Use this one-time token to continue the flow: \`${token}\` (expires ${new Date(tokenExpires).toLocaleString()}).\n\n` +
                     `Note: this token is not a password — it lets you securely finalize verification or trigger a reset flow.`,
          });
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

setInterval(pollAndNotify, 5000); // every 5s (tune as needed)

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

  // Request logging (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`);
      next();
    });
  }

  // ----------------------------
  // Core Routes (Always Available)
  // ----------------------------
  
  // Activity tracking from Roblox
  const activityRoute = require('./endpoints/activity');
  app.use('/activity', activityRoute);

  // Shifts management
  const shiftsRoute = require('./endpoints/shifts');
  app.use('/shifts', shiftsRoute);

  // Dashboard routes
  const dashboardRoute = require('./web/routes/dashboard');
  app.use('/dashboard', dashboardRoute);

  // Log In Routes
  const loginPageRoutes = require('./web/loginpage/routes');
  app.use('/loginpage', loginPageRoutes);

  // Settings routes
  const settingsRoute = require('./endpoints/settings');
  app.use('/settings', settingsRoute);

  // Verification routes
  const verificationRoutes = require('./endpoints/verification');
  app.use('/', verificationRoutes);
  
  // ----------------------------
  // Discord-Dependent Routes (Conditional)
  // ----------------------------
  
  if (client) {
    // Sessions route (Discord integration)
    const sessionsRoute = require('./endpoints/sessions')(client);
    app.use('/sessions', sessionsRoute);

    // SOTW role management (Discord integration)
    const sotwRoleRoute = require('./endpoints/sotw-role')(client);
    app.use('/sotw-role', sotwRoleRoute);
  } else {
    // Provide fallback responses when Discord bot unavailable
    app.use('/sessions', (req, res) => {
      res.status(503).json({ 
        error: 'Discord bot not available',
        message: 'Sessions endpoint requires Discord integration'
      });
    });

    app.use('/sotw-role', (req, res) => {
      res.status(503).json({ 
        error: 'Discord bot not available',
        message: 'SOTW role management requires Discord integration'
      });
    });
  }

  // ----------------------------
  // Root Redirect
  // ----------------------------
  app.get('/', (req, res) => {
    res.redirect('/dashboard');
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      discord: client ? 'connected' : 'disconnected',
      uptime: process.uptime()
    });
  });

  // ----------------------------
  // Error Handlers (Must be last)
  // ----------------------------

  // 404 Not Found
  app.use((req, res) => {
    res.status(404).json({ 
      error: 'Endpoint not found',
      path: req.path,
      method: req.method
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(err.status || 500).json({ 
      error: 'Internal Server Error',
      message: isDevelopment ? err.message : 'An error occurred',
      stack: isDevelopment ? err.stack : undefined
    });
  });

  // ----------------------------
  // Start Server
  // ----------------------------
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = app.listen(PORT, HOST, () => {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║     🌐 Mochi Bar Dashboard Server         ║');
    console.log('╚════════════════════════════════════════════╝\n');
    console.log(`📊 Dashboard:        http://localhost:${PORT}/dashboard`);
    console.log(`🎮 Activity API:     http://localhost:${PORT}/activity`);
    console.log(`📅 Shifts API:       http://localhost:${PORT}/shifts`);
    console.log(`💚 Health Check:     http://localhost:${PORT}/health`);
    
    if (client) {
      console.log(`🤖 Discord Sessions: http://localhost:${PORT}/sessions`);
      console.log(`👑 SOTW Roles:       http://localhost:${PORT}/sotw-role`);
    } else {
      console.log(`⚠️  Discord routes unavailable (bot offline)`);
    }
    
    console.log(`\n🚀 Server running on ${HOST}:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });

  // ----------------------------
  // Auto-sync Discord shifts (if bot available)
  // ----------------------------
  if (client) {
    const fetch = require('node-fetch'); // Make sure to: npm install node-fetch@2
    
    // Auto-sync every 5 minutes
    setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${PORT}/sessions/sync`, {
          method: 'POST'
        });
        const result = await response.json();
        if (result.added > 0) {
          console.log(`🔄 Auto-sync: ${result.message}`);
        }
      } catch (err) {
        console.error('❌ Auto-sync failed:', err.message);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('🔄 Auto-sync enabled: Discord shifts sync every 5 minutes\n');
  }

  // ----------------------------
  // Graceful Shutdown
  // ----------------------------
  process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    if (client) {
      client.destroy();
      console.log('Discord bot disconnected');
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully...');
    if (client) {
      client.destroy();
      console.log('Discord bot disconnected');
    }
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
  });
}

// ----------------------------
// Start Application
// ----------------------------
main().catch(err => {
  console.error('❌ Fatal startup error:', err);
  process.exit(1);
});
