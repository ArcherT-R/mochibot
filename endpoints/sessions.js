// /endpoints/sessions.js
const express = require('express');
const router = express.Router();

const GUILD_ID = '1362322934794031104'; // your guild
const CHANNEL_ID = '1402605903508672554'; // session channel

// Resolve mentions or raw usernames to server nickname
async function resolveDiscordName(client, guild, text) {
  // If text is a mention like <@123456789>
  const mentionMatch = text.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member && member.nickname) return member.nickname;
      if (member && member.user) return member.user.username;
    } catch {
      // ignore
    }
  }

  // Otherwise just return the raw text
  return text.trim();
}

// Try parsing timestamp from text
function parseTimestamp(value) {
  // If it's all digits, treat as epoch
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }

  // Try parsing a human-readable date
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) {
    return Math.floor(parsed / 1000); // convert ms → seconds
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
        console.log("📩 Raw message:", msg.content); // debug log
        let host = null;
        let cohost = null;
        let overseer = null;
        let timestamp = null;

        const lines = msg.content.split(/\r?\n/);
        for (const line of lines) {
          const [key, ...rest] = line.split(':');
          if (!key || rest.length === 0) continue;

          const k = key.trim().toLowerCase();
          const value = rest.join(':').trim();
          if (!value) continue;

          switch (k) {
            case 'host':
            case 'main host':
              host = await resolveDiscordName(client, guild, value);
              break;
            case 'cohost':
              cohost = await resolveDiscordName(client, guild, value);
              break;
            case 'overseer':
              overseer = await resolveDiscordName(client, guild, value);
              break;
            case 'timestamp':
            case 'time':
              const ts = parseTimestamp(value);
              if (ts) timestamp = ts;
              break;
          }
        }

        // Only include if host and timestamp exist
        if (host && timestamp) {
          const session = { host, time: timestamp };
          if (cohost) session.cohost = cohost;
          if (overseer) session.overseer = overseer;
          sessions.push(session);
        }
      }

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
