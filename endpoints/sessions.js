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

module.exports = (client) => {
  router.get('/', async (req, res) => {
    try {
      const guild = await client.guilds.fetch(GUILD_ID);
      const channel = await guild.channels.fetch(CHANNEL_ID);
      if (!channel) return res.status(404).json({ error: 'Channel not found' });

      const messages = await channel.messages.fetch({ limit: 50 });
      const sessions = [];

      for (const msg of messages.values()) {
        let host = null;
        let cohost = null;
        let overseer = null;
        let timestamp = null; // declare here

        const lines = msg.content.split(/\r?\n/);
        for (const line of lines) {
          const [key, ...rest] = line.split(':');
          const value = rest.join(':').trim();
          if (!value) continue;

          switch (key.trim().toLowerCase()) {
            case 'host':
              host = await resolveDiscordName(client, guild, value);
              break;
            case 'cohost':
              cohost = await resolveDiscordName(client, guild, value);
              break;
            case 'overseer':
              overseer = await resolveDiscordName(client, guild, value);
              break;
            case 'timestamp':
              const tsMatch = value.match(/\d+/);
              if (tsMatch) timestamp = parseInt(tsMatch[0], 10);
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
