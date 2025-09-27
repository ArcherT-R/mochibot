const express = require("express");
const router = express.Router();
const { supabase } = require("./database"); // your Supabase client

// Join endpoint: add/update player
router.post("/join", async (req, res) => {
  const { roblox_id, username, avatar_url, group_rank } = req.body;

  if (!roblox_id || !username) return res.status(400).json({ error: "Missing roblox_id or username" });

  try {
    const { data, error } = await supabase
      .from("players")
      .upsert(
        {
          roblox_id,
          username,
          avatar_url,
          group_rank
        },
        { onConflict: "roblox_id" } // update existing
      );

    if (error) throw error;

    console.log("✅ Player created/updated:", username);
    res.json({ success: true, player: data });
  } catch (err) {
    console.error("Failed to create/update player:", err);
    res.status(500).json({ error: err.message });
  }
});

// Log activity endpoint
router.post("/log", async (req, res) => {
  const { roblox_id, minutes_played } = req.body;

  if (!roblox_id || minutes_played == null) return res.status(400).json({ error: "Missing roblox_id or minutes_played" });

  try {
    // Increment total_activity by minutes_played
    const { data, error } = await supabase
      .from("players")
      .update({ total_activity: supabase.raw("total_activity + ?", [minutes_played]) })
      .eq("roblox_id", roblox_id);

    if (error) throw error;

    console.log(`✅ Added ${minutes_played} minutes to player ${roblox_id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to log activity:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
