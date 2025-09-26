const express = require("express");
const router = express.Router();
const axios = require("axios"); // for fetching /sessions
const { getAllPlayers, searchPlayersByUsername } = require("../../endpoints/database");

// Helper to convert Discord timestamp to readable format
function formatDiscordTimestamp(ts) {
  const date = new Date(ts * 1000); // Discord timestamp is in seconds
  return date.toLocaleString(); // change to your preferred format
}

// Main dashboard
router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

    // Calculate top 3 most active players
    const topPlayers = [...players]
      .sort((a, b) => b.total_activity - a.total_activity)
      .slice(0, 3);

    // Fetch sessions from /sessions endpoint
    const sessionsResp = await axios.get(`${process.env.DASHBOARD_BASE_URL}/sessions`);
    let sessions = sessionsResp.data || [];

    // Sort by time ascending and take next 3
    const upcomingShifts = sessions
      .sort((a, b) => a.time - b.time)
      .slice(0, 3)
      .map((s) => ({
        host: s.host,
        cohost: s.cohost || null,
        overseer: s.overseer || null,
        time: formatDiscordTimestamp(s.time),
      }));

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
