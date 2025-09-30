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

// Utility: Attach ongoing session data to players
async function attachLiveSessionData(players) {
  return await Promise.all(players.map(async player => {
    const ongoingSession = await getOngoingSession(player.roblox_id);
    player.ongoing_session_start_time = ongoingSession?.session_start_time || null;
    return player;
  }));
}

// ----------------------------
// Main Dashboard
// ----------------------------
router.get("/", async (req, res) => {
  try {
    const allPlayers = await getAllPlayers();

    // Get top 8 players based on weekly_minutes
    const initialTopPlayers = [...allPlayers]
      .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
      .slice(0, 8);

    // Attach live session info
    const topPlayers = await attachLiveSessionData(initialTopPlayers);

    res.render("dashboard", { players: allPlayers, topPlayers });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------
// Player Profile
// ----------------------------
router.get("/player/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const player = await getPlayerByUsername(username);
    if (!player) return res.status(404).send("Player not found");

    const sessions = await getPlayerSessions(player.roblox_id);
    const shifts = await getPlayerShifts(player.roblox_id) || { attended: 0, hosted: 0, coHosted: [] };
    const ongoingSession = await getOngoingSession(player.roblox_id);

    res.render("player", { player, sessions, shifts, ongoingSession });
  } catch (err) {
    console.error("Error loading player page:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ----------------------------
// Search Players (for dashboard search box)
// ----------------------------
router.get("/search", async (req, res) => {
  try {
    const q = req.query.username?.trim();
    if (!q) return res.json([]);

    const allPlayers = await getAllPlayers();
    const matches = allPlayers.filter(p => p.username.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10); // limit to top 10 matches
    res.json(matches);
  } catch (err) {
    console.error("Error searching players:", err);
    res.json([]);
  }
});

module.exports = () => router;
