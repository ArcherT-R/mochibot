// endpoints/sessions.js
const express = require('express');
const router = express.Router();
const sessionsData = require('../sessionsData'); // your cached session info

// Assuming your bot client is passed in
module.exports = (client) => {

  // Get sessions
  router.get('/', async (req, res) => {
    try {
      // Clone data so we can modify without affecting original
      const sessions = JSON.parse(JSON.stringify(Object.values(sessionsData.sessions)));

      for (const session of sessions) {
        // Convert Host
        if (session.host) {
          const match = session.host.match(/<@!?(\d+)>/);
          if (match) {
            const userId = match[1];
            try {
              const member = await client.users.fetch(userId);
              session.host = member.username;
            } catch {
              session.host = "Unknown";
            }
          }
        }

        // Convert CoHost
        if (session.cohost) {
          const match = session.cohost.match(/<@!?(\d+)>/);
          if (match) {
            const userId = match[1];
            try {
              const member = await client.users.fetch(userId);
              session.cohost = member.username;
            } catch {
              session.cohost = "Unknown";
            }
          }
        }

        // Convert Overseer
        if (session.overseer) {
          const match = session.overseer.match(/<@!?(\d+)>/);
          if (match) {
            const userId = match[1];
            try {
              const member = await client.users.fetch(userId);
              session.overseer = member.username;
            } catch {
              session.overseer = "Unknown";
            }
          }
        }
      }

      res.json(sessions);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to get sessions" });
    }
  });

  return router;
};
