const express = require("express");
const router = express.Router();
const { logPlayerSession } = require("./database");

router.post("/log-session", async (req, res) => {
  const { roblox_id, minutes_played, session_start, session_end } = req.body;

  if (!roblox_id || !minutes_played || !session_start || !session_end) {
    return res.status(400).json({ error: "Missing data" });
  }

  console.log("Logging session:", req.body);

  try {
    const session = await logPlayerSession(
      roblox_id,
      minutes_played,
      new Date(session_start * 1000),
      new Date(session_end * 1000)
    );
    res.json({ success: true, session });
  } catch (err) {
    console.error("Failed to log session:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
