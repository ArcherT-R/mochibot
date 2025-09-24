const express = require('express');
const router = express.Router();

const GUILD_ID = '1362322934794031104'; // your guild
const CHANNEL_ID = '1402605903508672554'; // session channel

/**
 * Resolves Discord mentions or plain usernames to their nickname#discriminator.
 * If not a mention, returns the original text.
 */
async function resolveDiscordMentions(client, guild, text) {
  if (!text) return "";

  // Match all user mentions
  const matches = [...text.matchAll(/<@!?(\d+)>/g)];

  for (const match of matches) {
    const id = match[1];
    let usernameTag = "<Unknown User>";

    try {
      const member = await guild.members.fetch(id).catch(() => null);
      if (member && member.user) {
        usernameTag = member.nickname
          ? `${member.nickname}#${member.user.discriminator}`
          : `${member.user.username}#${member.user.discriminator}`;
      }
    } catch (err) {
      console.warn(`Failed to fetch member ${id}:`, err);
    }

    // Replace the mention in text
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
          const [rawKey, ...rest] = line.split(":");
          if (!rawKey || rest.length === 0) continue;

          const key = rawKey.trim().toLowerCase();
          const value = rest.join(":").trim();
          if (!value) continue;

          switch (key) {
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
              timestamp = value;
              break;
          }
        }

        // Only add session if host and timestamp exist
        if (!host || !timestamp) continue;

        const session = { host, time: timestamp };
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
