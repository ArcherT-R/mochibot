const express = require('express');
const { getShiftByTime, addShift } = require('./database');

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

function parseTimestamps(timeString) {
  // Match all <t:TIMESTAMP:t> patterns in the string
  const timestampRegex = /<t:(\d+):[tTdDfFR]>/g;
  const matches = [...timeString.matchAll(timestampRegex)];
  return matches.map(match => parseInt(match[1], 10));
}

module.exports = (client) => {
  const router = express.Router();
  
  // Get sessions from Discord
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
        let timestamps = [];
        
        const lines = msg.content.split(/\r?\n/);
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;
          
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          
          if (!value) continue;
          
          switch (key) {
            case 'host':
              host = await resolveDiscordName(client, guild, value);
              break;
            case 'cohost':
              cohost = await resolveDiscordName(client, guild, value);
              break;
            case 'overseer':
              overseer = await resolveDiscordName(client, guild, value);
              break;
            case 'times':
            case 'time':
              timestamps = parseTimestamps(value);
              break;
          }
        }
        
        // Create a separate session entry for each timestamp
        if (host && timestamps.length > 0) {
          for (const timestamp of timestamps) {
            const session = { 
              host, 
              cohost, 
              overseer, 
              shift_time: timestamp,
              timestamp
            };
            sessions.push(session);
          }
        }
      }
      
      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Sync Discord sessions to database
  router.post('/sync', async (req, res) => {
    try {
      if (!client.isReady()) return res.status(503).json({ error: 'Bot not ready' });
      
      const guild = await client.guilds.fetch(GUILD_ID);
      if (!guild) return res.status(500).json({ error: 'Guild not found' });
      
      const channel = await guild.channels.fetch(CHANNEL_ID);
      if (!channel) return res.status(500).json({ error: 'Channel not found' });
      
      const messages = await channel.messages.fetch({ limit: 50 });
      let added = 0;
      let skipped = 0;
      
      for (const msg of messages.values()) {
        let host = null;
        let cohost = null;
        let overseer = null;
        let timestamps = [];
        
        const lines = msg.content.split(/\r?\n/);
        for (const line of lines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;
          
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          
          if (!value) continue;
          
          switch (key) {
            case 'host':
              host = await resolveDiscordName(client, guild, value);
              break;
            case 'cohost':
              cohost = await resolveDiscordName(client, guild, value);
              break;
            case 'overseer':
              overseer = await resolveDiscordName(client, guild, value);
              break;
            case 'times':
            case 'time':
              timestamps = parseTimestamps(value);
              break;
          }
        }
        
        // Create a separate shift entry for each timestamp
        if (host && timestamps.length > 0) {
          for (const timestamp of timestamps) {
            const existing = await getShiftByTime(timestamp);
            
            if (!existing) {
              await addShift({ 
                shift_time: timestamp, 
                host, 
                cohost, 
                overseer 
              });
              added++;
              console.log(`✅ Synced shift: ${host} at ${new Date(timestamp * 1000).toISOString()}`);
            } else {
              skipped++;
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        added, 
        skipped,
        message: `Synced ${added} new shifts, skipped ${skipped} existing shifts`
      });
    } catch (err) {
      console.error('Error syncing sessions:', err);
      res.status(500).json({ error: 'Failed to sync sessions' });
    }
  });
  
  return router;
};
