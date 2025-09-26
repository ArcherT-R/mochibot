// startup.js
const express = require('express');
const path = require('path');
const { startBot } = require('./bot/client'); // your bot

async function main() {
  // Start the bot
  const client = await startBot();

  // Initialize Express
  const app = express();

  // Views
  app.set('views', path.join(__dirname, 'web/views'));
  app.set('view engine', 'ejs');

  // Static files
  app.use(express.static(path.join(__dirname, 'web/public')));

  // Routes
  const dashboardRoute = require('./web/routes/dashboard')(client); // pass client to dashboard
  const dashboardSearchRoute = require('./web/routes/dashboardSearch');
  const sessionsRoute = require('./endpoints/sessions')(client); // sessions endpoint
  const sotwRoleRoute = require('./endpoints/sotw-role')(app, client); // sotw-role endpoint

  app.use('/dashboard/search', dashboardSearchRoute);
  app.use('/dashboard', dashboardRoute);
  app.use('/sessions', sessionsRoute);
  // /sotw-role already mounted in the module

  // Root redirect
  app.get('/', (req, res) => res.redirect('/dashboard'));

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🌐 Dashboard running on port ${PORT}`));
}

main().catch(console.error);

