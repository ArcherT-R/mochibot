const express = require("express");
const router = express.Router();
const { getPlayerByUsername, getPlayerSessions, getPlayerShifts } = require("../../endpoints/database");

module.exports = () => {
  router.get("/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const player = await getPlayerByUsername(username);
      if (!player) return res.status(404).send("Player not found");

      const sessions = await getPlayerSessions(player.roblox_id);
      const shifts = await getPlayerShifts(player.roblox_id) || { attended: 0, hosted: 0, coHosted: [] };

      // Example: Ongoing session (replace with real-time data if available)
      const ongoingSession = null;

      // Build activity object for EJS
      const activity = {
        ongoingSession,
        pastSessions: sessions
          .sort((a, b) => b.session_start - a.session_start)
          .slice(0, 4)
          .map(s => ({
            name: `Session on ${new Date(s.session_start).toLocaleDateString()}`,
            details: `Minutes Played: ${s.minutes_played}`
          }))
      };

      // Pass everything to EJS
      res.render("player", { player, activity, shifts });

    } catch (err) {
      console.error("Error loading player:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
