const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');

async function main() {
  try {
    // ----------------------------
    // Start Discord bot client
    // ----------------------------
    const client = await startBot();

    // ----------------------------
    // Initialize Express
    // ----------------------------
    const app = express();

    // ----------------------------
    // Views
    // ----------------------------
    app.set('views', path.join(__dirname, 'web/views'));
    app.set('view engine', 'ejs');

    // ----------------------------
    // Static files
    // ----------------------------
    app.use(express.static(path.join(__dirname, 'web/public')));
    app.use(express.json()); // needed for POST endpoints

    // ----------------------------
    // Routes
    // ----------------------------

    // Dashboard route (exports a function returning router)
    const dashboardRoute = require('./web/routes/dashboard')();
    app.use('/dashboard', dashboardRoute);

    // Dashboard search (exports router directly)
    const dashboardSearchRoute = require('./web/routes/dashboardSearch');
    app.use('/dashboard/search', dashboardSearchRoute);

    // Sessions route (exports a function returning router)
    const sessionsRoute = require('./endpoints/sessions')(client);
    app.use('/sessions', sessionsRoute);

    // Activity route (exports router directly)
    const activityRoute = require('./endpoints/activity');
    app.use('/activity', activityRoute);

    // SOTW role route (exports a function returning router)
    const sotwRoleRoute = require('./endpoints/sotw-role')(client);
    app.use('/sotw-role', sotwRoleRoute);

    // Shifts route (exports router directly)
    const shiftsRoute = require('./endpoints/shifts');
    app.use('/shifts', shiftsRoute);

    // ----------------------------
    // Root redirect
    // ----------------------------
    app.get('/', (req, res) => res.redirect('/dashboard'));

    // ----------------------------
    // Start server
    // ----------------------------
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🌐 Dashboard running on port ${PORT}`);
    });

  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

// Run main
main();
