// endpoints/verification.js
const express = require('express');
const router = express.Router();
const db = require('./database'); // your Supabase functions
const bodyParser = require('body-parser');

router.post('/game-claim', bodyParser.json(), async (req, res) => {
  console.log('[Verification] Incoming request:', req.body);
  try {
    const { username, code } = req.body;
    if (!username || !code) {
      console.log('[Verification] Missing username or code');
      return res.status(400).json({ success: false, error: 'Missing username or code' });
    }

    const verificationRecord = await db.getVerificationRequest(code);
    console.log('[Verification] Found record:', verificationRecord);

    if (!verificationRecord) {
      console.log('[Verification] Invalid code');
      return res.status(404).json({ success: false, error: 'Invalid code' });
    }

    const { roblox_id } = verificationRecord;
    const player = await db.getPlayerByRobloxId(roblox_id);
    console.log('[Verification] Found player:', player);

    if (!player) {
      console.log('[Verification] No player found for code');
      return res.status(404).json({ success: false, error: 'No player found for code' });
    }

    await db.deleteVerificationCode(code);

    console.log('[Verification] Returning credentials for', player.username);
    return res.json({
      success: true,
      username: player.username,
      password: player.password
    });

  } catch (err) {
    console.error('[Verification] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
