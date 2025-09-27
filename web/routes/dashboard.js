const express = require("express");
const router = express.Router();
const { getAllPlayers, getPlayerByUsername } = require("../../endpoints/database");

module.exports = () => {

  // Main dashboard
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Sort by weekly minutes (new session-based tracking)
      const topPlayers = [...players]
        .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
        .slice(0, 3);

      // Pass to dashboard template
      res.render("dashboard", { topPlayers });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  // Player profile route
  router.get("/player/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const player = await getPlayerByUsername(username);
      if (!player) return res.status(404).send("Player not found");

      res.render("player", { player });
    } catch (err) {
      console.error("Error loading player:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
