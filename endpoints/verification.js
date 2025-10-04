// endpoints/verification.js
const express = require('express');
const router = express.Router();
const db = require('./database'); // your Supabase functions
const bodyParser = require('body-parser');

// Roblox sends JSON payload { username, code }
router.post('/game-claim', bodyParser.json(), async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({ success: false, error: 'Missing username or code' });
    }

    // Look up the verification code in your DB
    const verificationRecord = await db.getVerificationCode(code);

    if (!verificationRecord) {
      return res.status(404).json({ success: false, error: 'Invalid code' });
    }

    // The code exists — return the linked Roblox username/password
    const { roblox_id } = verificationRecord;
    const player = await db.getPlayerByRobloxId(roblox_id);

    if (!player) {
      return res.status(404).json({ success: false, error: 'No player found for code' });
    }

    // Delete code after use to prevent reuse
    await db.deleteVerificationCode(code);

    // Return credentials (username/password)
    return res.json({
      success: true,
      username: player.username,
      password: player.password, // or password_hash if you have plain-text temporarily
    });

  } catch (err) {
    console.error('[Verification] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
