const express = require("express");
const router = express.Router();
const { getAllPlayers, getPlayerByUsername, getUpcomingShifts } = require("../../endpoints/database");

module.exports = (client) => {

  // Main dashboard
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Calculate top 3 most active players
      const topPlayers = [...players]
        .sort((a, b) => (b.total_activity || 0) - (a.total_activity || 0))
        .slice(0, 3);

      // Get next 3 shifts
      const upcomingShifts = await getUpcomingShifts(); // returns array of { host, cohost?, overseer?, time }

      res.render("dashboard", { topPlayers, upcomingShifts });
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
