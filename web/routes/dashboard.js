const express = require("express");
const router = express.Router();
const { getAllPlayers } = require("../../endpoints/database");

module.exports = () => {
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

  return router;
};
