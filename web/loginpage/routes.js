// web/loginpage/routes.js
const express = require('express');
const router = express.Router();
const db = require('../../endpoints/database'); // make sure path is correct

// -------------------------
// Login page
// -------------------------

// Render login page (optional if you have HTML)
router.get('/', (req, res) => {
  res.sendFile('login.html', { root: __dirname });
});

// Handle login POST
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password required" });
    }

    const result = await db.verifyPlayerPassword(username, password);

    if (!result.success) {
      return res.status(401).json({ success: false, error: result.error });
    }

    // Optionally: create a session here
    // req.session.player = { roblox_id: result.player.roblox_id, username: result.player.username }

    res.json({ success: true, player: {
      roblox_id: result.player.roblox_id,
      username: result.player.username,
      avatar_url: result.player.avatar_url,
      group_rank: result.player.group_rank
    }});
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// Optional: endpoint to get player info by username (for profile page)
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) return res.status(400).json({ error: "Username required" });

    const player = await db.getPlayerByUsername(username);
    if (!player) return res.status(404).json({ error: "Player not found" });

    res.json({
      username: player.username,
      roblox_id: player.roblox_id,
      avatar_url: player.avatar_url,
      group_rank: player.group_rank,
      weekly_minutes: player.weekly_minutes
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
