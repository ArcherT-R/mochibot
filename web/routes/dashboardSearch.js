const express = require("express");
const router = express.Router();
const { searchPlayersByUsername } = require("../../endpoints/database");

router.get("/", async (req, res) => {
  const { username } = req.query;
  if (!username || username.length < 1) return res.json([]); // ignore empty queries

  try {
    // Search players with partial match
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
