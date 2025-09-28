// endpoints/activity.js
const express = require("express");
const router = express.Router();
const { logPlayerSession, createPlayerIfNotExists } = require("./database");

// POST /activity/log-session
router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (!roblox_id || !minutes_played || !session_start || !session_end) {
    return res.status(400).json({ error: "Missing data. Required: roblox_id, minutes_played, session_start, session_end" });
  }

  try {
    // Ensure player exists in DB
    await createPlayerIfNotExists({ roblox_id, username: "Unknown", avatar_url: null, group_rank: null });

    // Log the session
    const updatedPlayer = await logPlayerSession(
      roblox_id,
      Number(minutes_played),
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );

    return res.json({
      success: true,
      message: "Session logged",
      player: updatedPlayer
    });
  } catch (err) {
    console.error("Failed to log session:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

module.exports = router;
