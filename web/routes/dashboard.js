const express = require("express");
const router = express.Router();
const { getAllPlayers, getPlayerByUsername, getPlayerSessions } = require("../../endpoints/database");

module.exports = () => {
  // Main dashboard
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Top 3 players by weekly minutes
      const topPlayers = [...players]
        .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
        .slice(0, 3);

      res.render("dashboard", { topPlayers });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // Player profile
  router.get("/player/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const player = await getPlayerByUsername(username);
      if (!player) return res.status(404).send("Player not found");

      // Fetch player sessions
      const sessions = await getPlayerSessions(player.roblox_id);

      res.render("player", { player, sessions });
    } catch (err) {
      console.error("Error loading player:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
