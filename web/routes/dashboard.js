const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getAllPlayers } = require("../../endpoints/database");

const SESSIONS_URL = process.env.DASHBOARD_API_URL + "/sessions"; // ensure this env variable is set

// Main dashboard
router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

    // Top 3 most active players
    const topPlayers = [...players]
      .sort((a, b) => b.total_activity - a.total_activity)
      .slice(0, 3);

    // Fetch sessions from /sessions endpoint
    const { data: sessions } = await axios.get(SESSIONS_URL);

    // Sort by timestamp and take next 3
    const upcomingShifts = sessions
      .sort((a, b) => a.time - b.time)
      .slice(0, 3)
      .map((s) => ({
        host: s.host,
        cohost: s.cohost || null,
        overseer: s.overseer || null,
        time: new Date(s.time * 1000), // convert UNIX timestamp to Date
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

module.exports = router;

