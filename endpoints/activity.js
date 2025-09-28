// endpoints/activity.js
const express = require("express");
const router = express.Router();
const { createPlayerIfNotExists, logPlayerSession } = require("./database");

// -------------------------
// /activity/join
// -------------------------
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;

  if (!roblox_id || !username) {
    console.warn("Missing data in /join:", req.body);
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const player = await createPlayerIfNotExists({
      roblox_id,
      username,
      avatar_url,
      group_rank
    });
    console.log(`✅ Player ensured in DB: ${username}`);
    res.json(player);
  } catch (err) {
    console.error(`❌ Failed to ensure player in DB: ${username}`, err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------
// /activity/log-session
// -------------------------
router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    console.warn("Missing data in /log-session:", req.body);
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const updatedPlayer = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );

    console.log(`✅ Logged session for ${updatedPlayer.username}`);
    res.json(updatedPlayer);
  } catch (err) {
    console.error(`❌ Failed to log session for ${roblox_id}`, err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

