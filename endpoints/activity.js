const express = require("express");
const router = express.Router();
const { logPlayerSession, createPlayerIfNotExists } = require("./database");

router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (!roblox_id || minutes_played == null || !session_start || !session_end) {
    console.warn("Missing data:", req.body);
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
    console.error("Failed to log session:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
