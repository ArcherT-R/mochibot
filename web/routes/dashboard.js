// web/routes/dashboard.js
const express = require("express");
const router = express.Router();
const {
  getAllPlayers,
  getPlayerByUsername,
  getUpcomingShifts
} = require("../../endpoints/database");

module.exports = (client) => {

  // Main dashboard
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Top 3 most active players (by total_activity)
      const topPlayers = [...players]
        .sort((a, b) => (b.total_activity || 0) - (a.total_activity || 0))
        .slice(0, 3);

      // Next 3 upcoming shifts
      const upcomingShifts = await getUpcomingShifts();

      res.render("dashboard", { topPlayers, upcomingShifts });
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

      // Optional: Add shifts hosted/attended counts
      const hostedShifts = await client.shiftsHosted(player.roblox_id); // Or fetch from DB
      const attendedShifts = await client.shiftsAttended(player.roblox_id);

      // Add them to the player object for rendering
      player.shifts_hosted = hostedShifts || 0;
      player.shifts_attended = attendedShifts || 0;

      res.render("player", { player });
    } catch (err) {
      console.error("Error loading player:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
