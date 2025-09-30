// web/routes/dashboard.js
const express = require("express");
const router = express.Router();
const { 
  getAllPlayers,
  getPlayerByUsername,
  getOngoingSession
} = require("../../endpoints/database");

// ----------------------------
// Helper: Attach live session data
// ----------------------------
async function attachLiveSessionData(players) {
  return await Promise.all(players.map(async (player) => {
    const ongoing = await getOngoingSession(player.roblox_id);
    player.ongoing_session_start_time = ongoing ? ongoing.session_start_time : null;
    return player;
  }));
}

// ----------------------------
// Dashboard main page
// ----------------------------
router.get("/", async (req, res) => {
  try {
    // 1. Get all players
    const allPlayers = await getAllPlayers();

    // 2. Sort top players by weekly_minutes
    const topPlayersInitial = [...allPlayers]
      .sort((a,b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
      .slice(0, 8); // take top 8 for dashboard

    // 3. Attach ongoing session info
    const topPlayers = await attachLiveSessionData(topPlayersInitial);

    res.render("dashboard", { topPlayers, players: allPlayers });
  } catch (err) {
    console.error("Failed to load dashboard:", err);
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

    // Fetch ongoing session
    const ongoingSession = await getOngoingSession(player.roblox_id);

    res.render("player", { player, ongoingSession });
  } catch (err) {
    console.error("Error loading player page:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
