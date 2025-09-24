const express = require('express');
const router = express.Router();
const { Client } = require('discord.js');

const GUILD_ID = '1362322934794031104'; // your guild
const CHANNEL_ID = '1402605903508672554'; // session channel

async function resolveDiscordMentions(client, guild, text) {
  const matches = [...text.matchAll(/<@!?(\d+)>/g)];

  for (const match of matches) {
    const id = match[1];
    let usernameTag = "<Unknown User>";

    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member && member.user) {
        usernameTag = `${member.user.username}#${member.user.discriminator}`;
      }
    } catch (err) {
      console.warn(`Failed to fetch member ${id}:`, err);
    }

    text = text.replace(match[0], usernameTag);
  }

  return text;
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
        let host = "", cohost = "", overseer = "", timestamp = "";

        // Match lines like "Host: ...", "CoHost: ...", "Overseer: ...", "Timestamp: ..."
        const lines = msg.content.split(/\r?\n/);
        for (const line of lines) {
          const [key, ...rest] = line.split(":");
          const value = rest.join(":").trim();
          if (!value) continue;

          switch (key.trim().toLowerCase()) {
            case 'host':
              host = await resolveDiscordMentions(client, guild, value);
              break;
            case 'cohost':
              cohost = await resolveDiscordMentions(client, guild, value);
              break;
            case 'overseer':
              overseer = await resolveDiscordMentions(client, guild, value);
              break;
            case 'timestamp':
              timestamp = value;
              break;
          }
        }

        sessions.push({
          host: host || null,
          cohost: cohost || null,
          overseer: overseer || null,
          time: timestamp || null,
          status: 'Planned' // default, you can parse differently if needed
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
