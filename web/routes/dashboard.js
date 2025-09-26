const express = require("express");
const router = express.Router();
const { getAllPlayers } = require("../../endpoints/database");

router.get("/", async (req, res) => {
  try {
    const players = await getAllPlayers();

    res.render("dashboard", {
      title: "Mochi Bar | Dashboard",
      players,
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
