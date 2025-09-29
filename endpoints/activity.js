// /endpoints/activity.js
const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); 
// CRITICAL FIX: Add deletePlayerLiveSession and getOngoingSession to imports
const { 
    createPlayerIfNotExists, 
    logPlayerSession, 
    logPlayerLive, 
    deletePlayerLiveSession,
    getOngoingSession // Not used here, but good practice if routes use it
} = require("./database"); 

const GROUP_ID = 35807738; 

// In-memory live sessions
const activeSessions = {};

// ---------------------------
// Player Join Endpoint - OK
// ---------------------------
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;
  if (!roblox_id || !username) {
    return res.status(400).json({ error: "Missing roblox_id or username" });
  }
  try {
    const player = await createPlayerIfNotExists({
      roblox_id,
      username,
      avatar_url: avatar_url || "",
      group_rank: group_rank || "Guest",
    });
    console.log(`✅ Player ensured in DB: ${username} (${roblox_id})`);
    res.json(player);
  } catch (err) {
    console.error("❌ Failed to ensure player:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// Log Session Endpoint - OK
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
    res.status(500).json({ error: err.message });
  }
});

// POST /activity/live - OK
router.post("/live", async (req, res) => {
  try {
    const { roblox_id, username, current_minutes } = req.body;
    if (!roblox_id || !username || current_minutes == null)
      return res.status(400).json({ error: "Missing parameters" });
    
    // Pass session_start_time as null/undefined here, as it's only set on /start-session
    await logPlayerLive(roblox_id, username, current_minutes); 
    
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error updating live session:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ---------------------------
// Start Live Session - UPDATED for Persistent Timer
// ---------------------------
local function startLiveSession(player, playerInfo, startTime) -- ADD startTime parameter
	local payload = {
		roblox_id = player.UserId,
		username = player.Name,
		avatar_url = playerInfo.avatarUrl,
		group_rank = playerInfo.groupRank,
        session_start_time = startTime -- ADDED: The Unix timestamp (os.time())
	}
	local success, result = pcall(function()
		HttpService:PostAsync(API_START_SESSION_URL, HttpService:JSONEncode(payload), Enum.HttpContentType.ApplicationJson)
	end)
	if success then
		print("🟢 [Activity] Live session started for:", player.Name)
	else
		warn("❌ [Activity] Failed to start live session for:", player.Name, "| Error:", result)
	end
end

// ---------------------------
// End Live Session - FIXED against Unhandled Rejection
// ---------------------------
router.post("/end-session", async (req, res) => {
    const { roblox_id } = req.body;
    if (!roblox_id) return res.status(400).json({ error: "Missing roblox_id" });

    // 1. Delete from fast in-memory object (Always safe)
    const removed = activeSessions[roblox_id];
    if (removed) {
        console.log(`🔴 Live session ended: ${removed.username} (In-memory)`);
        delete activeSessions[roblox_id];
    }
    
    // 2. CRITICAL FIX: Ensure the entire DB operation is inside the try...catch
    try {
        // Delete the row from the player_live table in Supabase
        await deletePlayerLiveSession(roblox_id); 
        console.log(`🔴 Live session successfully deleted from DB: ${roblox_id}`);
        
        // Respond success to the Roblox client
        res.json({ success: true });
    } catch (err) {
        // This handles the ERR_UNHANDLED_REJECTION
        console.error("❌ Failed to delete live session from DB:", err); 
        
        // Respond 500 but log the error (or 200 if you want to prioritize the Roblox thread finishing)
        res.status(500).json({ error: "Failed to delete live session from DB" });
    }
});

// ---------------------------
// Get All Active Sessions - OK
// ---------------------------
router.get("/active", (req, res) => {
  const list = Object.values(activeSessions).map(s => ({
    ...s,
    minutes_played: Math.floor((Date.now() - s.session_start) / 60000),
  }));
  res.json(list);
});

module.exports = router;
