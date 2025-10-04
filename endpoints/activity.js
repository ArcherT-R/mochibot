// /endpoints/activity.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); 
// CRITICAL: Ensure all necessary database functions are imported
const { 
    createPlayerIfNotExists, 
    logPlayerSession, 
    logPlayerLive, 
    deletePlayerLiveSession,
    getOngoingSession,
    updatePlayerInfo,
    getPlayerByRobloxId
} = require("./database"); 

// Note: You should replace 35807738 with your actual group ID if it's different
const GROUP_ID = 35807738; 

// In-memory live sessions (Used for the /active endpoint)
const activeSessions = {};

// ---------------------------
// /join Endpoint (Player joins game)
// ---------------------------
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank, password } = req.body;
  if (!roblox_id || !username) {
    return res.status(400).json({ error: "Missing roblox_id or username" });
  }
  try {
    // Check if player already exists
    const existingPlayer = await getPlayerByRobloxId(roblox_id);
    
    if (existingPlayer) {
      // Player exists - update their info (including username and rank changes)
      await updatePlayerInfo(roblox_id, {
        username,
        avatar_url: avatar_url || existingPlayer.avatar_url,
        group_rank: group_rank || existingPlayer.group_rank
        // Don't update password - keep existing one
      });
      console.log(`✅ Player updated in DB: ${username} (${roblox_id})`);
      res.json({ ...existingPlayer, username, group_rank });
    } else {
      // Player doesn't exist - create new
      const player = await createPlayerIfNotExists({
        roblox_id,
        username,
        avatar_url: avatar_url || "",
        group_rank: group_rank || "Guest",
        password: password || null
      });
      console.log(`✅ Player created in DB: ${username} (${roblox_id})`);
      res.json(player);
    }
  } catch (err) {
    console.error("❌ Failed to ensure player:", err);
    res.status(500).json({ error: "Failed to process player join." });
  }
});
// ---------------------------
// /log-session Endpoint (Session completed)
// ---------------------------
router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    return res.status(400).json({ error: "Missing data" });
  }
  try {
    const updatedPlayer = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );
    console.log(`✅ Logged session for ${roblox_id}: ${minutes_played} minutes`);
    res.json(updatedPlayer);
  } catch (err) {
    console.error("❌ Failed to log session:", err);
    res.status(500).json({ error: "Failed to log session data." });
  }
});

// ---------------------------
// /live Endpoint (Roblox hourly/minutely update)
// ---------------------------
router.post("/live", async (req, res) => {
  try {
    const { roblox_id, username, current_minutes } = req.body;
    if (!roblox_id || !username || current_minutes == null)
      return res.status(400).json({ error: "Missing parameters" });
    
    // Updates current_minutes in DB. session_start_time is omitted/null, 
    // ensuring it only gets set once on /start-session.
    await logPlayerLive(roblox_id, username, current_minutes); 
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error updating live session:", err);
    res.status(500).json({ error: "Internal Server Error during live update." });
  }
});

// ---------------------------
// /start-session Endpoint (Player joins game, initiates live tracking) - FINAL FIX
// ---------------------------
router.post("/start-session", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank, session_start_time } = req.body;
  if (!roblox_id || !username || !session_start_time) {
    console.error("Missing required fields for /start-session:", req.body);
    return res.status(400).json({ error: "Missing roblox_id, username, or session_start_time" });
}

  // Use the Unix timestamp provided by the Roblox client
  const startTime = Number(session_start_time); 

  // 1. Update In-Memory Cache (for /active route)
  activeSessions[roblox_id] = {
    roblox_id,
    username,
    avatar_url: avatar_url || "",
    group_rank: group_rank || "Guest",
    session_start: startTime, // Stored as Unix MS in memory
  };
  
  // 2. Log to DB (CRITICAL: Logs to player_live table)
  try {
    // Current minutes is 0 on start, using startTime (Unix timestamp)
    await logPlayerLive(roblox_id, username, 0, startTime);
    console.log(`🟢 Live session successfully started and logged to DB for: ${username}`);
    res.json({ success: true });
    
  } catch (err) {
    // If the database fails, log the error clearly and still respond success 
    // to the Roblox client to prevent retries (though the dashboard will be broken)
    console.error(`❌ FAILED to log session start to player_live for ${username}:`, err.message);
    
    // Check if the failure is critical (e.g., bad keys, wrong table name)
    // If you respond 500, Roblox might retry, which might spam your server.
    // If you respond 200, Roblox moves on, but the live session is not in the DB.
    // For live session start, responding 200 is often safer to keep the game running.
    res.status(200).json({ success: false, reason: "DB_FAILURE_LIVE_START" });
  }
});

// ---------------------------
// /end-session Endpoint (Player leaves game) - FIXED against Unhandled Rejection
// ---------------------------
router.post("/end-session", async (req, res) => {
    const { roblox_id } = req.body;
    if (!roblox_id) return res.status(400).json({ error: "Missing roblox_id" });

    // 1. Delete from fast in-memory object 
    const removed = activeSessions[roblox_id];
    if (removed) {
        console.log(`🔴 Live session ended: ${removed.username} (In-memory cleanup)`);
        delete activeSessions[roblox_id];
    }
    
    // 2. CRITICAL FIX: Ensure the entire DB operation is inside the try...catch
    try {
        await deletePlayerLiveSession(roblox_id); 
        console.log(`🔴 Live session successfully deleted from DB: ${roblox_id}`);
        
        // Respond success to the Roblox client
        res.json({ success: true });
    } catch (err) {
        // This handles the ERR_UNHANDLED_REJECTION
        console.error("❌ Failed to delete live session from DB:", err); 
        
        // Respond 500 but still ensures the HTTP request finishes cleanly
        res.status(500).json({ error: "Failed to delete live session from DB." });
    }
});

// ---------------------------
// /active Endpoint (Dashboard poll for current players)
// ---------------------------
router.get("/active", (req, res) => {
  const list = Object.values(activeSessions).map(s => ({
    ...s,
    // Calculate elapsed minutes based on the recorded start time
    minutes_played: Math.floor((Date.now() - s.session_start) / 60000),
  }));
  res.json(list);
});

module.exports = router;
