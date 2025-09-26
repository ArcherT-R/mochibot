const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // Node 18+ has global fetch
const { getAllPlayers, searchPlayersByUsername } = require("../../endpoints/database");

// Main dashboard
router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

    // Calculate top 3 most active players
    const topPlayers = [...players]
      .sort((a, b) => b.total_activity - a.total_activity)
      .slice(0, 3);

    // Fetch sessions from /sessions endpoint
    const sessionsResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/sessions`);
    const sessions = await sessionsResponse.json();

    // Sort sessions by time and pick next 3
    const upcomingShifts = sessions
      .sort((a, b) => a.time - b.time)
      .slice(0, 3);

    res.render("dashboard", {
      title: "Mochi Bar | Dashboard",
      topPlayers,
      upcomingShifts,
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Search endpoint for AJAX
router.get("/search", async (req, res) => {
  const { username } = req.query;
  if (!username) return res.json([]);

  try {
    const results = await searchPlayersByUsername(username);
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json([]);
  }
});

module.exports = router;
