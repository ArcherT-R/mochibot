// endpoints/activity.js
const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Roblox will send: { roblox_id: 123456, minutes_played: 15 }
router.post("/", async (req, res) => {
  console.log("📩 Received body:", req.body);

  if (!req.body) return res.status(400).json({ error: "No body provided" });

  const { roblox_id, minutes_played } = req.body;
  if (!roblox_id || minutes_played == null) {
    console.error("❌ Missing roblox_id or minutes_played");
    return res.status(400).json({ error: "Missing roblox_id or minutes_played" });
  }

  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    console.log("📅 Today's date:", today);

    // Check if a log for this user today already exists
    const { data: existing, error: selectError } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("roblox_id", roblox_id)
      .eq("date", today)
      .limit(1);

    if (selectError) {
      console.error("❌ Supabase select error:", selectError);
      return res.status(500).json({ error: selectError.message });
    }

    if (existing && existing.length > 0) {
      // Update existing row
      const log = existing[0];
      console.log("💡 Existing row found:", log);

      const { data, error } = await supabase
        .from("activity_logs")
        .update({ minutes_played: log.minutes_played + Number(minutes_played) })
        .eq("id", log.id);

      if (error) {
        console.error("❌ Supabase update error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Updated minutes_played for ${roblox_id}: +${minutes_played}`);
      return res.json({ success: true, action: "updated", data });
    } else {
      // Insert new row
      const { data, error } = await supabase.from("activity_logs").insert([
        {
          roblox_id,
          date: today,
          minutes_played: Number(minutes_played),
          sessions_hosted: 0
        },
      ]);

      if (error) {
        console.error("❌ Supabase insert error:", error);
        return res.status(500).json({ error: error.message });
      }

      console.log(`✅ Inserted new activity log for ${roblox_id}: ${minutes_played} minutes`);
      return res.json({ success: true, action: "inserted", data });
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
