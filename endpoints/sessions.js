const express = require('express');
const { getShiftByTime } = require('./database'); // Add this function to database.js

const GUILD_ID = '1362322934794031104';
const CHANNEL_ID = '1402605903508672554';

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

module.exports = (client) => {
  const router = express.Router();
  
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
        let host = null;
        let cohost = null;
        let overseer = null;
        let timestamp = null;
        
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
          const session = { 
            host, 
            cohost, 
            overseer, 
            shift_time: new Date(timestamp * 1000).toISOString(),
            timestamp // Include raw timestamp for duplicate checking
          };
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
