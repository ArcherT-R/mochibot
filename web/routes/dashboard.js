const axios = require("axios");

const SESSIONS_URL = `${process.env.DASHBOARD_API_URL}/sessions`;

router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

    // Fetch sessions from /sessions endpoint
    let upcomingShifts = [];
    try {
      const { data: sessions } = await axios.get(SESSIONS_URL);
      upcomingShifts = sessions
        .sort((a, b) => a.time - b.time)
        .slice(0, 3)
        .map(s => ({
          host: s.host,
          cohost: s.cohost,
          overseer: s.overseer,
          time: new Date(s.time * 1000).toLocaleString() // auto-convert UNIX timestamp
        }));
    } catch (err) {
      console.error("Error fetching sessions:", err.message);
    }

    // Top 3 players
    const topPlayers = [...players]
      .sort((a, b) => b.total_activity - a.total_activity)
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
