const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAllPlayers, searchPlayersByUsername } = require("../../endpoints/database");

// Make sure to set this in your environment variables
const SESSIONS_URL = `${process.env.DASHBOARD_API_URL}/sessions`;

// Main dashboard
router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

    // Top 3 most active players
    const topPlayers = [...players]
      .sort((a, b) => b.total_activity - a.total_activity)
      .slice(0, 3);

    // Next 3 shifts from /sessions endpoint
    let upcomingShifts = [];
    try {
      const { data: sessions } = await axios.get(SESSIONS_URL);
      upcomingShifts = sessions
        .sort((a, b) => a.time - b.time)
        .slice(0, 3)
        .map(s => ({
          host: s.host,
          cohost: s.cohost || "",
          overseer: s.overseer || "",
          time: new Date(s.time * 1000).toLocaleString(), // convert UNIX timestamp
        }));
    } catch (err) {
      console.error("Error fetching sessions:", err.message);
    }

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

// Search endpoint
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
