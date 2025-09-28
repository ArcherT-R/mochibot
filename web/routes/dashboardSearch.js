const express = require("express");
const router = express.Router();
const { searchPlayersByUsername } = require("../../endpoints/database");

router.get("/", async (req, res) => {
  let { username } = req.query;
  if (!username || username.length < 1) return res.json([]);

  // Force lowercase for consistent matching
  username = username.toLowerCase();

  try {
    // Search players in Supabase (ilike is already case-insensitive)
    const players = await searchPlayersByUsername(username);

    // Map results into suggestion objects
    const suggestions = players.map(player => ({
      username: player.username,
      avatar: player.avatar_url,
      groupRank: player.group_rank,
      weeklyMinutes: player.weekly_minutes
    }));

    res.json(suggestions);
  } catch (err) {
    console.error("Dashboard search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;

