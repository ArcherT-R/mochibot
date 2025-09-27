const express = require("express");
const router = express.Router();
const { searchPlayersByUsername } = require("../../endpoints/database");

router.get("/", async (req, res) => {
  const { username } = req.query;

  try {
    const players = await searchPlayersByUsername(username);
    res.json(players);
  } catch (err) {
    console.error("Dashboard search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
