const express = require("express");
const router = express.Router();
const { getPlayerByUsername, getPlayerSessions } = require("../../endpoints/database");

module.exports = () => {
  router.get("/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const player = await getPlayerByUsername(username);
      if (!player) return res.status(404).send("Player not found");

      const sessions = await getPlayerSessions(player.roblox_id);

      res.render("player", { player, sessions });
    } catch (err) {
      console.error("Error loading player:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return router;
};
