const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

router.get("/", async (req, res) => {
  try {
    let { username } = req.query;
    if (!username) return res.json([]);

    username = username.trim(); // remove extra whitespace

    const { data, error } = await supabase
      .from("players")
      .select("username, avatar_url, group_rank, total_activity")
      .ilike("username", `%${username}%`) // case-insensitive partial match
      .limit(10);

    if (error) {
      console.error("Dashboard search error:", error);
      return res.status(500).json([]);
    }

    return res.json(data || []);
  } catch (err) {
    console.error("Unexpected dashboard search error:", err);
    return res.status(500).json([]);
  }
});

module.exports = router;
