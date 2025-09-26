// web/routes/dashboard.js
const express = require("express");
const router = express.Router();
const axios = require("axios"); // for fetching /sessions

module.exports = (client) => {
  // Main dashboard
  router.get("/", async (req, res) => {
    try {
      // Fetch players from DB
      const { getAllPlayers } = require("../../endpoints/database");
      const players = await getAllPlayers();

      // Top 3 most active
      const topPlayers = [...players].sort((a,b) => b.total_activity - a.total_activity).slice(0,3);

      // Fetch next 3 shifts from /sessions endpoint
      const sessionsUrl = process.env.BASE_URL + "/sessions"; // make sure BASE_URL is set in .env
      const { data: allSessions } = await axios.get(sessionsUrl);
      const upcomingShifts = allSessions
        .sort((a,b) => a.time - b.time)
        .slice(0,3)
        .map(s => ({
          host: s.host,
          cohost: s.cohost,
          overseer: s.overseer,
          time: new Date(s.time * 1000) // convert Unix timestamp to JS Date
        }));

      res.render("dashboard", { title: "Mochi Bar | Dashboard", topPlayers, upcomingShifts });
    } catch (err) {
      console.error("Error loading dashboard:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};

