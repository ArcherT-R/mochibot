// startup.js
const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');

async function main() {
  try {
    const client = await startBot();

    const app = express();

    // Views
    app.set('views', path.join(__dirname, 'web/views'));
    app.set('view engine', 'ejs');

    // Static files
    app.use(express.static(path.join(__dirname, 'web/public')));
    app.use(express.json()); // needed for POST /activity

    // Routes
    const dashboardRoute = require('./web/routes/dashboard')(client);
    const dashboardSearchRoute = require('./web/routes/dashboardSearch');
    const sessionsRoute = require('./endpoints/sessions')(client);
    const activityRoute = require('./endpoints/activity');
    const sotwRole = require('./endpoints/sotw-role');
    
    // Mount endpoints
    app.use('/dashboard/search', dashboardSearchRoute);
    app.use('/dashboard', dashboardRoute);
    app.use('/sessions', sessionsRoute);
    app.use('/activity', activityRoute);
    app.use('/sotw-role', sotwRole);

    // Root redirect
    app.get('/', (req, res) => res.redirect('/dashboard'));

    // Start server
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

