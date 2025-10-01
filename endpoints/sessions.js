// /endpoints/sessions.js
const express = require('express');
const router = express.Router();
const { addOrUpdateShift, getAllShifts } = require('./database'); // new DB functions

const GUILD_ID = '1362322934794031104'; // your Discord guild
const CHANNEL_ID = '1402605903508672554'; // your session channel

/**
 * Resolve Discord mention or raw text to a display name
 */
async function resolveDiscordName(client, guild, text) {
  const mentionMatch = text.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) return member.nickname || member.user.username;
    } catch {}
  }
  return text.trim();
}

module.exports = (client) => {

  // -------------------------
  // GET /sessions - Fetch and return upcoming sessions
  // -------------------------
  router.get('/', async (req, res) => {
    try {
      if (!client.isReady()) return res.status(503).json({ error: 'Bot not ready' });

      const guild = await client.guilds.fetch(GUILD_ID);
      if (!guild) return res.status(500).json({ error: 'Guild not found' });

      const channel = await guild.channels.fetch(CHANNEL_ID);
      if (!channel) return res.status(500).json({ error: 'Channel not found' });

      const messages = await channel.messages.fetch({ limit: 50 });
      const sessions = [];

      for (const msg of messages.values()) {
        let host = null, cohost = null, overseer = null, timestamp = null;

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
            case 'time':
              const tsMatch = value.match(/\d+/);
              if (tsMatch) timestamp = parseInt(tsMatch[0], 10);
              break;
          }
        }

        if (host && timestamp) {
          const session = { host, time: timestamp };
          if (cohost) session.cohost = cohost;
          if (overseer) session.overseer = overseer;

          // Upsert into public.shifts table
          try {
            await addOrUpdateShift(session);
          } catch (dbErr) {
            console.error('Error saving shift to DB:', dbErr);
          }

          sessions.push(session);
        }
      }

      // Sort by timestamp ascending
      sessions.sort((a, b) => a.time - b.time);

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
