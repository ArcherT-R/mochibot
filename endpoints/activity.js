// /endpoints/activity.js
const express = require("express");
const router = express.Router();
const { logPlayerSession, createPlayerIfNotExists } = require("./database");

// -------------------------
// Create / Ensure player exists
// -------------------------
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;

  if (!roblox_id || !username) {
    console.warn("Missing join data:", req.body);
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const player = await createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank });
    console.log("✅ Ensured player in DB:", player.username);
    res.json(player);
  } catch (err) {
    console.error("❌ Failed to ensure player in DB:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// Log a session
// -------------------------
router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    console.warn("Missing session data:", req.body);
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const updatedPlayer = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );
    console.log("✅ Logged session:", updatedPlayer.username);
    res.json(updatedPlayer);
  } catch (err) {
    console.error("❌ Failed to log session:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
