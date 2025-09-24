const express = require('express');
const router = express.Router();

const DISCORD_GUILD_ID = '1362322934794031104' // your server ID
const DISCORD_CHANNEL_ID = '1402605903508672554'; // channel where sessions are posted

module.exports = (client) => {
  // GET sessions
  router.get('/', async (req, res) => {
    try {
      const guild = await client.guilds.fetch(DISCORD_GUILD_ID);
      const channel = await guild.channels.fetch(DISCORD_CHANNEL_ID);

      if (!channel || !channel.isTextBased()) {
        return res.status(500).json({ error: 'Invalid channel' });
      }

      // Fetch messages (last 50 for example)
      const messages = await channel.messages.fetch({ limit: 50 });
      const sessions = [];

      for (const msg of messages.values()) {
        const content = msg.content;

        const session = {};

        // Match lines with "Host:", "CoHost:", "Overseer:", "Timestamp:"
        const hostMatch = content.match(/Host:\s*(.+)/i);
        const cohostMatch = content.match(/CoHost:\s*(.+)/i);
        const overseerMatch = content.match(/Overseer:\s*(.+)/i);
        const timestampMatch = content.match(/Timestamp:\s*(.+)/i);

        if (hostMatch) session.host = await resolveDiscordMentions(client, guild, hostMatch[1]);
        if (cohostMatch) session.cohost = await resolveDiscordMentions(client, guild, cohostMatch[1]);
        if (overseerMatch) session.overseer = await resolveDiscordMentions(client, guild, overseerMatch[1]);

        if (timestampMatch) {
          const ts = new Date(timestampMatch[1]);
          session.time = isNaN(ts.getTime()) ? null : ts.toISOString();
        }

        if (Object.keys(session).length > 0) sessions.push(session);
      }

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Helper: resolve Discord mentions to usernames
  async function resolveDiscordMentions(client, guild, text) {
    return text.replace(/<@!?(\d+)>/g, (match, id) => {
      const member = guild.members.cache.get(id);
      if (member) return `${member.user.username}#${member.user.discriminator}`;
      return match; // leave as-is if not found
    });
  }

  return router;
};
