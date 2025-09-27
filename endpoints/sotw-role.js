// endpoints/sotw-role.js
const express = require('express');
const router = express.Router();

module.exports = (client) => {
  router.get('/', async (req, res) => {
    try {
      const { robloxId } = req.query;
      const ROLE_ID = '1401529260509761648';
      const BOT_DATA_CHANNEL_ID = process.env.BOT_DATA_CHANNEL_ID;
      const GUILD_ID = process.env.GUILD_ID;

      if (!robloxId) {
        return res.status(400).json({ error: 'robloxId is required' });
      }

      if (!client.isReady()) {
        return res.status(503).json({ error: 'Bot not ready' });
      }

      // Fetch guild
      const guild = await client.guilds.fetch(GUILD_ID);
      if (!guild) {
        return res.status(500).json({ error: 'Guild not found' });
      }

      // Fetch bot data channel
      const channel = await client.channels.fetch(BOT_DATA_CHANNEL_ID);
      if (!channel) {
        return res.status(500).json({ error: 'Bot data channel not found' });
      }

      // Get latest bot data message
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      if (!lastMessage) {
        return res.status(500).json({ error: 'No bot data found' });
      }

      const botData = JSON.parse(lastMessage.content);
      const mappings = botData.linkedUsers?.robloxToDiscord || {};
      const discordId = mappings[robloxId];

      if (!discordId) {
        return res.json({ linked: false, hasRole: false, reason: 'Not linked' });
      }

      // Check member in guild
      const member = await guild.members.fetch(discordId).catch(() => null);
      if (!member) {
        return res.json({ linked: true, hasRole: false, reason: 'User not in guild' });
      }

      const hasRole = member.roles.cache.has(ROLE_ID);
      return res.json({ linked: true, hasRole });
    } catch (err) {
      console.error('Error in /sotw-role:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
