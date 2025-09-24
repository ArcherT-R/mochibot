const express = require('express');
const router = express.Router();

const GUILD_ID = '1362322934794031104';
const CHANNEL_ID = '1402605903508672554';

async function resolveDiscordMentions(client, guild, text) {
  if (!text) return text;

  // Match mentions like <@123456789>
  const matches = [...text.matchAll(/<@!?(\d+)>/g)];

  for (const match of matches) {
    const id = match[1];
    let usernameTag = "<Unknown User>";

    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member) usernameTag = member.displayName;
    } catch (err) {
      console.warn(`Failed to fetch member ${id}:`, err);
    }

    text = text.replace(match[0], usernameTag);
  }

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
        let host = "";
        let cohost = "";
        let overseer = "";
        let timestamp = "";

        const lines = msg.content.split(/\r?\n/);

        for (const line of lines) {
          const [key, ...rest] = line.split(":");
          if (!key || rest.length === 0) continue;

          const value = rest.join(":").trim();
          if (!value) continue;

          switch (key.trim().toLowerCase()) {
            case 'host':
              host = await resolveDiscordMentions(client, guild, value) || "";
              break;
            case 'cohost':
              cohost = await resolveDiscordMentions(client, guild, value) || "";
              break;
            case 'overseer':
              overseer = await resolveDiscordMentions(client, guild, value) || "";
              break;
            case 'timestamp':
              timestamp = value; // Keep as-is, e.g., <t:1758776400:F>
              break;
          }
        }

        // Always include host and time
        const session = {
          host: host || "",
          time: timestamp || ""
        };

        if (cohost) session.cohost = cohost;
        if (overseer) session.overseer = overseer;

        sessions.push(session);
      }

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
