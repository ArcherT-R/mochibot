module.exports = (app, client) => {
  app.get('/sotw-role', async (req, res) => {
    try {
      const { robloxId } = req.query;
      const ROLE_ID = '1401529260509761648';

      if (!robloxId) return res.status(400).json({ error: 'robloxId is required' });

      const { loadLinkedUsers } = require('../data/data');
      const linkedUsers = loadLinkedUsers();
      const mappings = linkedUsers.robloxToDiscord || {};

      const discordId = mappings[robloxId];
      if (!discordId) return res.json({ hasRole: false, reason: 'Not linked' });

      if (!client.isReady()) return res.status(503).json({ error: 'Bot not ready' });

      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild) return res.status(500).json({ error: 'Guild not found' });

      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) return res.json({ hasRole: false, reason: 'User not in guild' });

      const hasRole = member.roles.cache.has(ROLE_ID);
      return res.json({ hasRole });
    } catch (err) {
      console.error('Error in /sotw-role:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};
