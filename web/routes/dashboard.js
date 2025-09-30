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

// Function to attach ongoing session data to a player list
async function attachLiveSessionData(players) {
    const playersWithLiveStatus = await Promise.all(players.map(async (player) => {
        // Check for an ongoing session
        const ongoingSession = await getOngoingSession(player.roblox_id);
        
        // If an ongoing session exists, attach its start time
        if (ongoingSession) {
            player.ongoing_session_start_time = ongoingSession.session_start_time;
        } else {
            // Ensure the field is null or undefined if no session is active
            player.ongoing_session_start_time = null;
        }
        return player;
    }));
    return playersWithLiveStatus;
}

module.exports = () => {
  // ----------------------------
  // Main dashboard
  // ----------------------------
  router.get("/", async (req, res) => {
    try {
      let allPlayers = await getAllPlayers();

      // 1. Get initial top players based on recorded weekly minutes
      const initialTopPlayers = [...allPlayers]
        .sort((a, b) => (b.weekly_minutes || 0) - (a.weekly_minutes || 0))
        .slice(0, 8); // Slice top 8 to ensure we have enough for the dashboard grid

      // 2. Fetch live session data for the initial top players
      // This adds the 'ongoing_session_start_time' property if a session is active.
      const topPlayers = await attachLiveSessionData(initialTopPlayers);

      // Pass only the topPlayers to avoid sending excessive data
      res.render("dashboard", { players: allPlayers, topPlayers }); 
    } catch (err) {
      console.error("Error loading dashboard:", err);
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

      // Fetch sessions
      const sessions = await getPlayerSessions(player.roblox_id);

      // Fetch shifts
      const shifts = await getPlayerShifts(player.roblox_id) || { attended: 0, hosted: 0, coHosted: [] };

      // Fetch ongoing session
      const ongoingSession = await getOngoingSession(player.roblox_id);

      res.render("player", { player, sessions, shifts, ongoingSession });
    } catch (err) {
      console.error("Error loading player page:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
