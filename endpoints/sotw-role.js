// endpoints/sotw-role.js
const { loadLinkedUsers } = require('../data/data');

const SOTW_ROLE_ID = '1401529260509761648';

module.exports = (app, client) => {
  app.get('/sotw-role', async (req, res) => {
    try {
      const { robloxUsername } = req.query;
      if (!robloxUsername) {
        return res.status(400).json({ error: 'robloxUsername is required' });
      }

      // Load linked users
      const linkedUsers = loadLinkedUsers();
      const mappings = linkedUsers.robloxToDiscord || {};

      const discordId = mappings[robloxUsername.toLowerCase()];
      if (!discordId) {
        return res.json({ hasRole: false, reason: 'Not linked' });
      }

      // Get the guild
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) {
        return res.status(500).json({ error: 'Guild not found' });
      }

      // Fetch the member
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) {
        return res.json({ hasRole: false, reason: 'User not in guild' });
      }

      // Check if they have the role
      const hasRole = member.roles.cache.has(SOTW_ROLE_ID);
      return res.json({ hasRole });
    } catch (err) {
      console.error('Error in /sotw-role:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

