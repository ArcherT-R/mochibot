const express = require("express");
const router = express.Router();
const { createPlayerIfNotExists, logPlayerActivity } = require("./database");

router.post("/join", async (req, res) => {
  const playerData = req.body;
  if (!playerData?.roblox_id) return res.status(400).json({ error: "Missing roblox_id" });

  try {
    const player = await createPlayerIfNotExists(playerData);
    res.json({ success: true, player });
  } catch (err) {
    console.error("Failed to create player:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/log", async (req, res) => {
  const { roblox_id, minutes_played } = req.body;
  if (!roblox_id || minutes_played == null) return res.status(400).json({ error: "Missing data" });

  try {
    const player = await logPlayerActivity(roblox_id, minutes_played);
    res.json({ success: true, player });
  } catch (err) {
    console.error("Failed to log activity:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
