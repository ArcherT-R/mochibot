// endpoints/sessions.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const GUILD_ID = '1362322934794031104'; // your Discord guild
const CHANNEL_ID = '1402605903508672554'; // session messages channel

// Resolve mentions or raw usernames to nickname
async function resolveDiscordName(client, guild, text) {
  const mentionMatch = text.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    const id = mentionMatch[1];
    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member && member.nickname) return member.nickname;
      if (member && member.user) return member.user.username;
    } catch {}
  }
  return text.trim();
}

// Upsert shift into Supabase
async function upsertShift({ host, cohost, overseer, timestamp }) {
  if (!host || !timestamp) return;

  const { data, error } = await supabase
    .from('shifts')
    .upsert(
      {
        host,
        cohost: cohost || null,
        overseer: overseer || null,
        shift_time: new Date(timestamp * 1000).toISOString()
      },
      { onConflict: ['host', 'shift_time'] } // prevent duplicates for same host + time
    );

  if (error) console.error('Supabase upsert error:', error);
  return data;
}

module.exports = (client) => {
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
          // Log to Supabase
          await upsertShift({ host, cohost, overseer, timestamp });

          // Prepare response for dashboard
          const session = { host, time: timestamp };
          if (cohost) session.cohost = cohost;
          if (overseer) session.overseer = overseer;
          sessions.push(session);
        }
      }

      // Return all sessions
      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
