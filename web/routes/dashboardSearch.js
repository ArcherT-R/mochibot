const express = require("express");
const router = express.Router();
const { searchPlayersByUsername } = require("../../endpoints/database");

// GET /dashboard/search?username=...
router.get("/", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json([]);

    // Search Supabase, case-insensitive
    const players = await searchPlayersByUsername(username);
    res.json(players);
  } catch (err) {
    console.error("Dashboard search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
