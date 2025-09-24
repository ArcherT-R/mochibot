const express = require('express');
const router = express.Router();

const GUILD_ID = '1362322934794031104'; // your guild
const CHANNEL_ID = '1402605903508672554'; // session channel

// Resolve mentions, usernames, or fallback text to nickname
async function resolveDiscordUser(client, guild, text) {
  text = text.trim();
  if (!text) return null;

  // 1️⃣ If it's a mention like <@123456789>
  const mentionMatch = text.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) return member.nickname || member.user.username;
    } catch (err) {
      console.warn(`Failed to fetch member ${id}:`, err);
    }
    return "<Unknown User>";
  }

  // 2️⃣ If it's a plain username, try to fetch member by username
  try {
    const members = await guild.members.fetch();
    const found = members.find(
      m => m.user.username.toLowerCase() === text.toLowerCase()
    );
    if (found) return found.nickname || found.user.username;
  } catch (err) {
    console.warn(`Failed to fetch members for username lookup:`, err);
  }

  // fallback: return the original text
  return text;
}

// Parse timestamps to ISO
function parseSessionTime(raw) {
  if (!raw) return null;

  const date = new Date(raw);
  if (!isNaN(date.getTime())) {
    return date.toISOString();
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

      // Sort sessions by time (earliest first)
      sessions.sort((a, b) => {
        if (a.time && b.time) return new Date(a.time) - new Date(b.time);
        return 0;
      });

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
