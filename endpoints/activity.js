// /endpoints/activity.js
const express = require("express");
const router = express.Router();
const {
  createPlayerIfNotExists,
  logPlayerSession
} = require("./database"); // <- must be at same level

// Player join endpoint
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;

  if (!roblox_id || !username)
    return res.status(400).json({ error: "Missing data" });

  console.log("POST /activity/join", req.body);

  try {
    const player = await createPlayerIfNotExists({
      roblox_id,
      username,
      avatar_url,
      group_rank
    });
    res.json(player);
  } catch (err) {
    console.error("Failed to create player:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (roblox_id == null || minutes_played == null || session_start == null || session_end == null) {
    return res.status(400).json({ error: "Missing data" });
  }

  try {
    const session = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(Number(session_start) * 1000),
      new Date(Number(session_end) * 1000)
    );
    res.json(session);
  } catch (err) {
    console.error("Failed to log session:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
