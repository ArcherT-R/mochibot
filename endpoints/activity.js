// endpoints/activity.js
const express = require('express');
const router = express.Router();
const { createPlayerIfNotExists, logPlayerActivity } = require('./database'); // your DB functions

// Player joins game
router.post('/join', async (req, res) => {
  const { roblox_id, username } = req.body;
  if (!roblox_id || !username) return res.status(400).json({ error: 'Missing roblox_id or username' });

  try {
    await createPlayerIfNotExists(roblox_id, username);
    console.log(`✅ Player added or exists: ${username} (${roblox_id})`);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to create player:', err);
    res.status(500).json({ success: false });
  }
});

// Log activity
router.post('/log', async (req, res) => {
  const { roblox_id, minutes_played } = req.body;
  if (!roblox_id || minutes_played == null) return res.status(400).json({ error: 'Missing data' });

  try {
    await logPlayerActivity(roblox_id, minutes_played);
    console.log(`✅ Activity logged for ${roblox_id}: ${minutes_played} min`);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to log activity:', err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;

