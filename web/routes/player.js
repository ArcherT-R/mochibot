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
      const shifts = await getPlayerShifts(player.roblox_id); // Optional if you track shifts

      // Ongoing session (for demonstration, null for now)
      const ongoingSession = null; 

      // Prepare activity for EJS
      const activity = {
        ongoingSession: ongoingSession,
        pastSessions: sessions
          .sort((a, b) => b.session_start - a.session_start) // latest first
          .slice(0, 4) // last 4
          .map(s => ({
            name: `Session on ${new Date(s.session_start).toLocaleDateString()}`,
            details: `Minutes Played: ${s.minutes_played}`
          }))
      };

      // Prepare shifts for EJS (if you have co-hosted or attended info)
      const shiftsData = {
        attended: shifts?.attended || 0,
        hosted: shifts?.hosted || 0,
        coHosted: shifts?.coHosted || []
      };

      res.render("player", { player, activity, shifts: shiftsData });
    } catch (err) {
      console.error("Error loading player:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
