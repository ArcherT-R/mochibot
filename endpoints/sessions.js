const express = require('express');
const router = express.Router();

const GUILD_ID = '1362322934794031104';
const CHANNEL_ID = '1402605903508672554';

async function resolveDiscordMentions(client, guild, text) {
  if (!text) return null;
  text = text.trim();

  // Match user mentions like <@123456789>
  const mentionMatch = text.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) return member.nickname || member.user.username;
    } catch {}
  }

  // Otherwise, treat as plain username/nickname
  return text || null;
}

function parseSessionTime(raw) {
  if (!raw) return null;
  raw = raw.trim();

  // Try ISO date first
  const date1 = new Date(raw);
  if (!isNaN(date1.getTime())) return date1.toISOString();

  // Try YYYY-MM-DD HH:MM
  let match = raw.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (match) {
    const [_, y, m, d, h, min] = match;
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min)).toISOString();
  }

  // Try DD/MM/YYYY HH:MM
  match = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})/);
  if (match) {
    const [_, d, m, y, h, min] = match;
    return new Date(Date.UTC(+y, +m - 1, +d, +h, +min)).toISOString();
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
          const idx = line.indexOf(":");
          if (idx === -1) continue;

          const key = line.slice(0, idx).trim().toLowerCase();
          const value = line.slice(idx + 1).trim();
          if (!value) continue;

          switch (key) {
            case "host":
              host = await resolveDiscordMentions(client, guild, value);
              break;
            case "cohost":
              cohost = await resolveDiscordMentions(client, guild, value);
              break;
            case "overseer":
              overseer = await resolveDiscordMentions(client, guild, value);
              break;
            case "timestamp":
              timestamp = parseSessionTime(value);
              break;
          }
        }

        sessions.push({
          ...(host && { host }),
          ...(cohost && { cohost }),
          ...(overseer && { overseer }),
          ...(timestamp && { time: timestamp })
        });
      }

      res.json(sessions);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
};
