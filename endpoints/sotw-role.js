module.exports = (app, client) => {
  app.get('/sotw-role', async (req, res) => {
    try {
      const { robloxId } = req.query;
      const ROLE_ID = '1401529260509761648';
      const CHANNEL_ID = '1420711771747913788'; // where links are logged
      const GUILD_ID = process.env.GUILD_ID;

      if (!robloxId) return res.status(400).json({ error: 'robloxId is required' });
      if (!client.isReady()) return res.status(503).json({ error: 'Bot not ready' });

      // Fetch guild and channel
      const guild = await client.guilds.fetch(GUILD_ID);
      const channel = await guild.channels.fetch(CHANNEL_ID);
      if (!channel) return res.status(500).json({ error: 'Channel not found' });

      // Fetch recent messages (adjust limit if needed)
      const messages = await channel.messages.fetch({ limit: 100 });

      // Build mapping from messages
      const mappings = {}; // robloxId -> discordId
      messages.forEach(msg => {
        const match = msg.content.match(/<@!?(\d+)>\s*→\s*(\w+)/);
        if (match) {
          const discordId = match[1];
          const robloxName = match[2];
          mappings[robloxName] = discordId; // or store Roblox ID if you have it
        }
      });

      const discordId = mappings[robloxId];
      if (!discordId) return res.json({ hasRole: false, reason: 'Not linked' });

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
