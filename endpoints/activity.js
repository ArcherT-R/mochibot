// endpoints/activity.js
const express = require("express");
const router = express.Router();
const { createPlayerIfNotExists, logPlayerActivity } = require("./database"); // make sure the path is correct
const bodyParser = require("body-parser");

router.use(bodyParser.json());

// Endpoint to add player if not exists
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;
  if (!roblox_id || !username) return res.status(400).json({ error: "Missing required fields" });

  try {
    const player = await createPlayerIfNotExists({ roblox_id, username, avatar_url, group_rank });
    console.log("✅ Player created/verified:", username);
    res.json(player);
  } catch (err) {
    console.error("Failed to create player:", err);
    res.status(500).json({ error: "Failed to create player" });
  }
});

// Endpoint to log activity
router.post("/log", async (req, res) => {
  const { roblox_id, minutes_played } = req.body;
  if (!roblox_id || !minutes_played) return res.status(400).json({ error: "Missing required fields" });

  try {
    const updatedPlayer = await logPlayerActivity(roblox_id, minutes_played);
    console.log("✅ Logged activity:", roblox_id, minutes_played, "minutes");
    res.json(updatedPlayer);
  } catch (err) {
    console.error("Failed to log activity:", err);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

module.exports = router;
