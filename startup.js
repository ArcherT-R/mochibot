const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');

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

  app.listen(PORT, HOST, () => {
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
  // Graceful Shutdown
  // ----------------------------
  process.on('SIGTERM', () => {
    console.log('\n🛑 SIGTERM received, shutting down gracefully...');
    if (client) {
      client.destroy();
      console.log('Discord bot disconnected');
    }
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received, shutting down gracefully...');
    if (client) {
      client.destroy();
      console.log('Discord bot disconnected');
    }
    process.exit(0);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit - log and continue
  });

  process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    // Exit on uncaught exceptions
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
