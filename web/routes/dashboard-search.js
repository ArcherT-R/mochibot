const express = require("express");
const router = express.Router();
const { searchPlayersByUsername } = require("../../endpoints/database"); // make sure this exists

router.get("/", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json([]);

  try {
    const players = await searchPlayersByUsername(username); // returns an array of players
    res.json(players);
  } catch (err) {
    console.error("Dashboard search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
