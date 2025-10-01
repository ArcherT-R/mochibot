// /web/routes/dashboard.js
const express = require("express");
const router = express.Router();
const {
  getAllPlayers,
  getPlayerByUsername,
  getPlayerSessions,
  getOngoingSession,
  searchPlayersByUsername
} = require("../../endpoints/database");

// Helper: Attach ongoing session data to a list of players
async function attachLiveSessionData(players) {
  return await Promise.all(players.map(async (player) => {
    const ongoing = await getOngoingSession(player.roblox_id);
    player.ongoing_session_start_time = ongoing?.session_start_time || null;
    return player;
  }));
}

// ----------------------------
// Main dashboard
// ----------------------------
router.get("/", async (req, res) => {
  try {
    const allPlayers = await getAllPlayers();

    // Top players
    const topPlayersRaw = [...allPlayers]
      .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
      .slice(0, 8);

    const topPlayers = await attachLiveSessionData(topPlayersRaw);

    // ✅ Pass session player to template
    const player = req.session?.player || null;

    res.render("dashboard", { players: allPlayers, topPlayers, player });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------
// Top players API endpoint
// ----------------------------
router.get("/top-players", async (req, res) => {
  try {
    const players = await getAllPlayers();
    const withLiveData = await attachLiveSessionData(players);
    const sorted = withLiveData
      .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
      .slice(0, 8);
    res.json(sorted);
  } catch (err) {
    console.error("Error fetching top players:", err);
    res.status(500).json({ error: "Failed to fetch top players" });
  }
});

// ----------------------------
// All players API endpoint
// ----------------------------
router.get("/players", async (req, res) => {
  try {
    const players = await getAllPlayers();
    res.json(players);
  } catch (err) {
    console.error("Error fetching players:", err);
    res.status(500).json({ error: "Failed to fetch players" });
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
    
    const sessions = await getPlayerSessions(player.roblox_id);
    const ongoingSession = await getOngoingSession(player.roblox_id);
    
    // Pass empty shift data - actual shift counting happens on frontend
    res.render("player", { 
      player, 
      sessions, 
      shifts: { attended: 0, hosted: 0 }, 
      ongoingSession 
    });
  } catch (err) {
    console.error("Error loading player page:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------
// Player search endpoint
// ----------------------------
router.get("/search", async (req, res) => {
  try {
    const q = req.query.username?.trim();
    if (!q) return res.json([]);
    
    const players = await searchPlayersByUsername(q);
    res.json(players || []);
  } catch (err) {
    console.error("Search error:", err);
    res.json([]);
  }
});

module.exports = router;
