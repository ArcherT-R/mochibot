const express = require('express');
const { client } = require('../bot/client');
const { loadLinkedUsers } = require('../data/data');

const PORT = process.env.PORT || 3000;
const STAFF_ROLE_ID = '1363595276576620595';

const app = express();
app.use(express.json());

// Root route for website
app.get('/', (req, res) => {
  res.send(`🤖 MochiBot is running! Uptime: ${process.uptime().toFixed(0)}s`);
});

// Health endpoint
app.get('/health', (req, res) => res.send('The ittsy bittsy spider.. bot is running!'));

// Check if a Roblox ID is linked (basic perk)
app.get('/check-perk', (req, res) => {
  const robloxId = req.query.robloxId;
  if (!robloxId) return res.status(400).json({ error: 'robloxId required' });

  const linkedUsers = loadLinkedUsers();
  const hasPerk = !!linkedUsers[robloxId];

  res.json({ hasPerk });
});

// Check if a Roblox ID is linked to a staff Discord member
app.get('/check-staff-otw', async (req, res) => {
  const robloxId = req.query.robloxId;
  if (!robloxId) return res.status(400).json({ error: 'robloxId required' });

  try {
    const linkedUsers = loadLinkedUsers();
    const discordId = linkedUsers[robloxId];
    if (!discordId) return res.json({ hasPerk: false });

    // Make sure client is ready
    if (!client.isReady()) return res.json({ hasPerk: false });

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return res.json({ hasPerk: false });

    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) return res.json({ hasPerk: false });

    const hasPerk = member.roles.cache.has(STAFF_ROLE_ID);
    res.json({ hasPerk });
  } catch (err) {
    console.error('Error in /check-staff-otw:', err);
    res.status(500).json({ hasPerk: false });
  }
});

// Start server
function startWebServer() {
  return new Promise(resolve => {
    app.listen(PORT, () => {
      console.log(`🌐 Web server running on port ${PORT}`);
      resolve();
    });
  });
}

module.exports = { startWebServer };
