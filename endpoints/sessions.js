// endpoints/sessions.js
const express = require('express');
const router = express.Router();

const SERVER_ID = '1362322934794031104';
const CHANNEL_ID = '1402605903508672554';

module.exports = (client) => {
  router.get('/', async (req, res) => {
    try {
      const guild = client.guilds.cache.get(SERVER_ID);
      if (!guild) return res.status(500).json({ error: 'Guild not found' });

      const channel = guild.channels.cache.get(CHANNEL_ID);
      if (!channel || !channel.isTextBased()) {
        return res.status(500).json({ error: 'Channel not found or not text-based' });
      }

      const messages = await channel.messages.fetch({ limit: 50 }); // adjust as needed
      const sessions = [];

      messages.forEach(msg => {
        const data = {};
        const lines = msg.content.split('\n');

        for (const line of lines) {
          const [key, ...rest] = line.split(':');
          if (!key || rest.length === 0) continue;

          const value = rest.join(':').trim();
          if (value.length === 0) continue;

          const lowerKey = key.trim().toLowerCase();
          if (lowerKey === 'host') data.host = value;
          else if (lowerKey === 'cohost') data.coHost = value;
          else if (lowerKey === 'overseer') data.overseer = value;
          else if (lowerKey === 'timestamp') data.timestamp = value;
        }

        // Only include messages that at least have a Host or Timestamp
        if (Object.keys(data).length > 0) sessions.push(data);
      });

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
