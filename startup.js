const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client');

async function main() {
  try {
    const client = await startBot();
    const app = express();

    app.set('views', path.join(__dirname, 'web/views'));
    app.set('view engine', 'ejs');

    app.use(express.static(path.join(__dirname, 'web/public')));
    app.use(express.json());

    // Routes
    const dashboardRoute = require('./web/routes/dashboard')();
    const dashboardSearchRoute = require('./web/routes/dashboardSearch');
    const sessionsRoute = require('./endpoints/sessions')(client);
    const activityRoute = require('./endpoints/activity');
    const sotwRoleRoute = require('./endpoints/sotw-role')(client);
    const shiftsRoute = require('./endpoints/shifts'); // ✅ corrected

    app.use('/dashboard/search', dashboardSearchRoute);
    app.use('/dashboard', dashboardRoute);
    app.use('/sessions', sessionsRoute);
    app.use('/activity', activityRoute);
    app.use('/sotw-role', sotwRoleRoute);
    app.use('/shifts', shiftsRoute);

    app.get('/', (req, res) => res.redirect('/dashboard'));

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
