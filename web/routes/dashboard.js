// web/routes/dashboard.js
const express = require("express");
const router = express.Router();
const {
  getAllPlayers,
  getPlayerByUsername,
  getPlayerSessions,
  getPlayerShifts,
  getOngoingSession
} = require("../../endpoints/database");

module.exports = () => {
  // ----------------------------
  // Main dashboard
  // ----------------------------
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Top 3 active this week
      const topPlayers = [...players]
        .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
        .slice(0, 3);

      res.render("dashboard", { players, topPlayers });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // ----------------------------
  // Player profile page
  // ----------------------------
  router.get("/player/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const player = await getPlayerByUsername(username);
      if (!player) return res.status(404).send("Player not found");

      // Fetch sessions
      const sessions = await getPlayerSessions(player.roblox_id);

      // Fetch shifts
      const shifts = await getPlayerShifts(player.roblox_id) || { attended: 0, hosted: 0, coHosted: [] };

      // Fetch ongoing session
      const ongoingSession = await getOngoingSession(player.roblox_id);

      res.render("player", { player, sessions, shifts, ongoingSession });
    } catch (err) {
      console.error("Error loading player page:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
