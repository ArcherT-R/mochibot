// endpoints/activity.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// POST /activity
router.post("/", async (req, res) => {
  const { roblox_id, username, minutes_played } = req.body;
  if (!roblox_id || !minutes_played) return res.status(400).send("Invalid data");

  try {
    // Find player
    const { data: playerData } = await supabase
      .from("players")
      .select("*")
      .eq("roblox_id", roblox_id)
      .single();

    let playerId;
    if (!playerData) {
      // Add new player if doesn't exist
      const { data: newPlayer } = await supabase
        .from("players")
        .insert({ roblox_id, username })
        .select()
        .single();
      playerId = newPlayer.id;
    } else {
      playerId = playerData.id;
    }

    // Add activity record
    await supabase.from("activity").insert({
      player_id: playerId,
      date: new Date(),
      minutes_played: Math.round(minutes_played)
    });

    res.send("OK");
  } catch (err) {
    console.error("Failed to log activity:", err);
    res.status(500).send("Error");
  }
});

module.exports = router;
