const express = require("express");
const router = express.Router();
const { getAllPlayers } = require("../../endpoints/database");

module.exports = (client) => {
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Top 3 most active
      const topPlayers = [...players]
        .sort((a, b) => (b.total_activity || 0) - (a.total_activity || 0))
        .slice(0, 3);

      // Next 3 shifts (using local shifts table)
      const upcomingShifts = players
        .flatMap(p => (p.shifts || []).map(s => ({
          host: p.username,
          time: new Date(s.start_time),
          cohost: s.cohost,
          overseer: s.overseer
        })))
        .sort((a, b) => a.time - b.time)
        .slice(0, 3);

      res.render("dashboard", { title: "Mochi Bar | Dashboard", topPlayers, upcomingShifts });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
