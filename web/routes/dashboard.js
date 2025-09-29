const express = require("express");
const router = express.Router();
const { getAllPlayers, getPlayerByUsername, getPlayerSessions } = require("../../endpoints/database");

module.exports = () => {
  // Main dashboard
  router.get("/", async (req, res) => {
    try {
      const players = await getAllPlayers();

      // Top 3 active this week
      const topPlayers = [...players]
        .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
        .slice(0, 3);

      res.render("dashboard", { players, topPlayers }); // pass players AND topPlayers
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

    // Fetch sessions from DB
    const sessions = await getPlayerSessions(player.roblox_id);

    // TODO: In future, fetch real-time ongoing session data from your API or memory
    const ongoingSession = null; // ✅ ensures variable is defined for EJS

    res.render("player", { player, sessions, ongoingSession });
  } catch (err) {
    console.error("Error loading player:", err);
    res.status(500).send("Internal Server Error");
  }
});

  return router;
};
