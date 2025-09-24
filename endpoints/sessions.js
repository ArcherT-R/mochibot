const express = require('express');
const router = express.Router();

const GUILD_ID = '1362322934794031104'; // your guild
const CHANNEL_ID = '1402605903508672554'; // session channel

// Resolve Discord mentions or plain usernames to nicknames#discriminator
async function resolveDiscordUser(client, guild, text) {
  text = text.trim();
  if (!text) return null;

  // If it's a mention
  const mentionMatch = text.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) return member.nickname || member.user.username;
    } catch (err) {
      console.warn(`Failed to fetch member ${id}:`, err);
      return text; // fallback to raw
    }
  }

  // If it looks like a raw username#discriminator
  const userTagMatch = text.match(/^([^#]+)#(\d{4})$/);
  if (userTagMatch) {
    const [_, username, discrim] = userTagMatch;
    // Try to find in guild
    const member = guild.members.cache.find(
      m => m.user.username === username && m.user.discriminator === discrim
    );
    if (member) return member.nickname || member.user.username;
  }

  // Otherwise just return the raw text
  return text;
}

// Convert raw timestamp to ISO string
function parseSessionTime(raw) {
  if (!raw) return null;

  const date = new Date(raw);
  if (!isNaN(date.getTime())) return date.toISOString();

  const match = raw.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (match) {
    const [_, y, m, d, h, min] = match;
    const dt = new Date(Date.UTC(+y, +m - 1, +d, +h, +min));
    return dt.toISOString();
  }

  return null;
}

module.exports = (client) => {
  router.get('/', async (req, res) => {
    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      const channel = await guild.channels.fetch(CHANNEL_ID);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const messages = await channel.messages.fetch({ limit: 50 });
      const sessions = [];

      for (const msg of messages.values()) {
        let host = null, cohost = null, overseer = null, timestamp = null;

        const lines = msg.content.split(/\r?\n/);
        for (const line of lines) {
          const [key, ...rest] = line.split(":");
          const value = rest.join(":").trim();
          if (!value) continue;

          switch (key.trim().toLowerCase()) {
            case 'host':
              host = await resolveDiscordUser(client, guild, value);
              break;
            case 'cohost':
              cohost = await resolveDiscordUser(client, guild, value);
              break;
            case 'overseer':
              overseer = await resolveDiscordUser(client, guild, value);
              break;
            case 'timestamp':
              timestamp = parseSessionTime(value);
              break;
          }
        }

        sessions.push({
          host: host || null,
          cohost: cohost || null,
          overseer: overseer || null,
          time: timestamp || null
        });
      }

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
