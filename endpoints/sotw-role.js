 // endpoints/sotw-role.js
module.exports = (app, client) => {
  app.get('/sotw-role', async (req, res) => {
    try {
      const { robloxId, roleId } = req.query;

      if (!robloxId || !roleId) {
        return res.status(400).json({ error: 'robloxId and roleId are required' });
      }

      // Load linked users
      const { loadLinkedUsers } = require('../data/data');
      const linkedUsers = loadLinkedUsers();
      const mappings = linkedUsers.robloxToDiscord || {};

      const discordId = mappings[robloxId];
      if (!discordId) {
        return res.json({ hasRole: false, reason: 'Not linked' });
      }

      // Get your guild
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
      const hasRole = member.roles.cache.has(roleId);
      return res.json({ hasRole });
    } catch (err) {
      console.error('Error in /sotw-role:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
