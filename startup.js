const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');

async function main() {
  try {
    // Start Discord bot client
    const client = await startBot();

    // Initialize Express
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
    const dashboardRoute = require('./web/routes/dashboard'); // router
    const dashboardSearchRoute = require('./web/routes/dashboardSearch'); // router
    const sessionsRoute = require('./endpoints/sessions')(client); // router factory
    const activityRoute = require('./endpoints/activity'); // router
    const sotwRoleRoute = require('./endpoints/sotw-role')(client); // router factory
    const shiftsRoute = require('./endpoints/shifts'); // router

    // Mount routes
    app.use('/dashboard/search', dashboardSearchRoute);
    app.use('/dashboard', dashboardRoute);
    app.use('/sessions', sessionsRoute);
    app.use('/activity', activityRoute);
    app.use('/sotw-role', sotwRoleRoute);
    app.use('/shifts', shiftsRoute);

    // Root redirect
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

main();
