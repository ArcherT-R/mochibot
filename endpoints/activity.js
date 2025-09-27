const express = require("express");
const router = express.Router();
const {
  createPlayerIfNotExists,
  logPlayerActivity
} = require("./database"); // make sure this path is correct

// Add or update player (join)
router.post("/join", async (req, res) => {
  try {
    const { roblox_id, username, avatar_url, group_rank } = req.body;
    if (!roblox_id || !username) return res.status(400).json({ error: "Missing roblox_id or username" });

    // Create or update player
    const player = await createPlayerIfNotExists({ roblox_id, username });

    // Update avatar_url and group_rank
    const { supabase } = require("./database");
    await supabase
      .from("players")
      .update({ avatar_url, group_rank })
      .eq("roblox_id", roblox_id);

    console.log("✅ Player checked/added:", username);
    res.json({ success: true, player });
  } catch (err) {
    console.error("Failed to create player:", err);
    res.status(500).json({ error: err.message });
  }
});

// Log activity
router.post("/log", async (req, res) => {
  try {
    const { roblox_id, minutes_played } = req.body;
    if (!roblox_id || minutes_played == null) return res.status(400).json({ error: "Missing roblox_id or minutes_played" });

    const player = await logPlayerActivity(roblox_id, minutes_played);
    console.log(`✅ Logged ${minutes_played} minutes for player ${roblox_id}`);
    res.json({ success: true, player });
  } catch (err) {
    console.error("Failed to log activity:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
