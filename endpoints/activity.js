// endpoints/activity.js
const express = require("express");
const router = express.Router();
const { createPlayerIfNotExists, logPlayerActivity } = require("./database");

router.use(express.json());

// Join endpoint - add player
router.post("/join", async (req, res) => {
  try {
    const { roblox_id, username, avatar_url, group_rank } = req.body;
    if (!roblox_id || !username) return res.status(400).json({ error: "Missing roblox_id or username" });

    const player = await createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank });
    res.json(player);
  } catch (err) {
    console.error("Failed to create player:", err);
    res.status(500).json({ error: err.message });
  }
});

// Log endpoint - activity in minutes
router.post("/log", async (req, res) => {
  try {
    const { roblox_id, minutes_played } = req.body;
    if (!roblox_id || !minutes_played) return res.status(400).json({ error: "Missing roblox_id or minutes_played" });

    const player = await logPlayerActivity(roblox_id, minutes_played);
    res.json(player);
  } catch (err) {
    console.error("Failed to log activity:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

