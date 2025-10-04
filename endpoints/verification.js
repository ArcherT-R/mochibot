// endpoints/verification.js
const express = require('express');
const router = express.Router();
const db = require('./database'); // adjust path
const AUTH_SECRET = process.env.GAME_SHARED_SECRET; // set in env

// POST /verification/game-claim
// body: { secret, username, code }
router.post('/game-claim', async (req, res) => {
  try {
    const { secret, username, code } = req.body;
    if (!secret || secret !== AUTH_SECRET) return res.status(403).json({ error: 'Forbidden' });
    if (!username || !code) return res.status(400).json({ error: 'Missing fields' });

    const result = await db.claimVerificationCode(code, username);
    if (!result.success) return res.status(400).json({ success: false, error: result.error || 'Invalid code' });

    // result.record contains the one_time_token etc.
    return res.json({ success: true, one_time_token: result.record.one_time_token });
  } catch (err) {
    console.error('game-claim error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
