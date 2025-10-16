// /endpoints/activity.js - IMPROVED VERSION
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); 
const { 
    createPlayerIfNotExists, 
    logPlayerSession, 
    logPlayerLive, 
    deletePlayerLiveSession,
    getOngoingSession,
    updatePlayerInfo,
    getPlayerByRobloxId
} = require("./database"); 

const GROUP_ID = 35807738; 
const activeSessions = {};

// Cleanup stale sessions older than 2 hours AND log their playtime
const STALE_SESSION_TIMEOUT = 2 * 60 * 60 * 1000;
setInterval(async () => {
  const now = Date.now();
  for (const [robloxId, session] of Object.entries(activeSessions)) {
    if (now - session.session_start > STALE_SESSION_TIMEOUT) {
      console.log(`🧹 Cleaning up stale session: ${session.username}`);
      
      try {
        // Use the ACTUAL minutes from Roblox client, not calculated timestamp
        const minutesPlayed = session.current_minutes || 0;
        
        // Log the session to permanent activity record
        await logPlayerSession(
          robloxId,
          minutesPlayed,
          new Date(session.session_start),
          new Date(now)
        );
        console.log(`✅ Saved ${minutesPlayed} minutes for stale session: ${session.username}`);
        
        // Now clean up
        await deletePlayerLiveSession(robloxId);
        delete activeSessions[robloxId];
        
      } catch (err) {
        console.error(`❌ Failed to cleanup stale session for ${robloxId}:`, err);
        // Still remove from memory to prevent it from staying forever
        delete activeSessions[robloxId];
      }
    }
  }
}, 10 * 60 * 1000); // Run every 10 minutes

// ---------------------------
// /join Endpoint
// ---------------------------
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank, password } = req.body;
  if (!roblox_id || !username) {
    return res.status(400).json({ error: "Missing roblox_id or username" });
  }
  try {
    const existingPlayer = await getPlayerByRobloxId(roblox_id);
    
    if (existingPlayer) {
      await updatePlayerInfo(roblox_id, {
        username,
        avatar_url: avatar_url || existingPlayer.avatar_url,
        group_rank: group_rank || existingPlayer.group_rank
      });
      console.log(`✅ Player updated: ${username} (${roblox_id})`);
      res.json({ ...existingPlayer, username, group_rank });
    } else {
      const player = await createPlayerIfNotExists({
        roblox_id,
        username,
        avatar_url: avatar_url || "",
        group_rank: group_rank || "Guest",
        password: password || null
      });
      console.log(`✅ Player created: ${username} (${roblox_id})`);
      res.json(player);
    }
  } catch (err) {
    console.error("❌ Failed to process player join:", err);
    res.status(500).json({ error: "Failed to process player join." });
  }
});

// ---------------------------
// /log-session Endpoint
// ---------------------------
router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;
  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    return res.status(400).json({ error: "Missing data" });
  }
  try {
    // Convert timestamps from seconds to milliseconds if needed
    let startMs = Number(session_start);
    let endMs = Number(session_end);
    
    if (startMs < 946684800000) startMs = startMs * 1000;
    if (endMs < 946684800000) endMs = endMs * 1000;
    
    const updatedPlayer = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(startMs),
      new Date(endMs)
    );
    console.log(`✅ Logged session for ${roblox_id}: ${minutes_played} minutes`);
    res.json(updatedPlayer);
  } catch (err) {
    console.error("❌ Failed to log session:", err);
    res.status(500).json({ error: "Failed to log session data." });
  }
});

// ---------------------------
// /live Endpoint - IMPROVED
// ---------------------------
router.post("/live", async (req, res) => {
  try {
    const { roblox_id, username, current_minutes } = req.body;
    if (!roblox_id || !username || current_minutes == null) {
      return res.status(400).json({ error: "Missing parameters" });
    }
    
    // Verify session exists in memory first
    if (!activeSessions[roblox_id]) {
      console.warn(`⚠️ /live called for non-active session: ${username} (${roblox_id})`);
      return res.status(404).json({ error: "No active session found" });
    }
    
    // Update the current_minutes in memory (critical for accurate cleanup)
    activeSessions[roblox_id].current_minutes = current_minutes;
    
    await logPlayerLive(roblox_id, username, current_minutes); 
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error updating live session:", err);
    res.status(500).json({ error: "Internal Server Error during live update." });
  }
});

// ---------------------------
// /start-session Endpoint - IMPROVED
// ---------------------------
router.post("/start-session", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank, session_start_time } = req.body;
  
  if (!roblox_id || !username || !session_start_time) {
    console.error("❌ Missing required fields for /start-session:", req.body);
    return res.status(400).json({ error: "Missing roblox_id, username, or session_start_time" });
  }

  const startTime = Number(session_start_time); 

  try {
    // CRITICAL: Log to DB FIRST, then update memory
    // This ensures if DB fails, we don't create orphaned in-memory sessions
    await logPlayerLive(roblox_id, username, 0, startTime);
    console.log(`🟢 Live session logged to DB for: ${username}`);
    
    // Only after DB success, add to in-memory cache
    activeSessions[roblox_id] = {
      roblox_id,
      username,
      avatar_url: avatar_url || "",
      group_rank: group_rank || "Guest",
      session_start: startTime,
    };
    
    res.json({ success: true });
    
  } catch (err) {
    console.error(`❌ CRITICAL: Failed to start session for ${username}:`, err.message);
    // Return 500 so Roblox client knows it failed
    res.status(500).json({ 
      success: false, 
      error: "Failed to start live session in database" 
    });
  }
});

// ---------------------------
// /end-session Endpoint - IMPROVED
// ---------------------------
router.post("/end-session", async (req, res) => {
  const { roblox_id } = req.body;
  if (!roblox_id) {
    return res.status(400).json({ error: "Missing roblox_id" });
  }

  try {
    const session = activeSessions[roblox_id];
    
    if (session) {
      // Session exists in memory - use tracked minutes
      const minutesPlayed = session.current_minutes || 0;
      
      // Save playtime to permanent record
      await logPlayerSession(
        roblox_id,
        minutesPlayed,
        new Date(session.session_start),
        new Date() // End time is now
      );
      console.log(`✅ Saved ${minutesPlayed} minutes on disconnect: ${session.username}`);
      
      // Clean up memory first
      delete activeSessions[roblox_id];
    } else {
      // Session not in memory but might be in DB (server restart scenario)
      console.warn(`⚠️ /end-session called for session not in memory: ${roblox_id}`);
      console.warn(`   This can happen after server restart - checking DB...`);
      
      // Try to get session info from database to save minutes
      const dbSession = await getOngoingSession(roblox_id);
      if (dbSession && dbSession.current_minutes) {
        await logPlayerSession(
          roblox_id,
          dbSession.current_minutes,
          dbSession.session_start_time || new Date(),
          new Date()
        );
        console.log(`✅ Recovered and saved ${dbSession.current_minutes} minutes from DB`);
      }
    }
    
    // Always try to delete from DB (whether in memory or not)
    await deletePlayerLiveSession(roblox_id); 
    console.log(`🔴 Live session deleted from DB: ${roblox_id}`);
    
    res.json({ success: true });
    
  } catch (err) {
    console.error("❌ Failed to end session:", err);
    
    // Still try to clean up memory even if DB fails
    if (activeSessions[roblox_id]) {
      delete activeSessions[roblox_id];
      console.log(`🔴 Removed from memory despite DB failure: ${roblox_id}`);
    }
    
    res.status(500).json({ error: "Failed to end session from DB." });
  }
});

// ---------------------------
// /active Endpoint
// ---------------------------
router.get("/active", (req, res) => {
  const list = Object.values(activeSessions).map(s => ({
    ...s,
    // Use the tracked current_minutes from Roblox instead of timestamp calculation
    minutes_played: s.current_minutes || 0,
  }));
  res.json(list);
});

module.exports = router;
