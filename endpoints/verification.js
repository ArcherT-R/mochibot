// endpoints/verification.js
const express = require('express');
const router = express.Router();
const db = require('./database'); // make sure path is correct
const bodyParser = require('body-parser');

router.post('/game-claim', bodyParser.json(), async (req, res) => {
  try {
    const { username, code } = req.body;

    if (!username || !code) {
      return res.status(400).json({ success: false, error: 'Missing username or code' });
    }

    console.log('[Verification] Incoming request:', { username, code });

    // Get the verification request
    const request = await db.getVerificationRequest(code);
    if (!request) {
      return res.status(404).json({ success: false, error: 'Invalid or expired code' });
    }

    console.log('[Verification] Found record:', request);

    // Claim the code (assign it to Roblox username, generate token)
    const claimResult = await db.claimVerificationRequest(code, username);
    if (!claimResult.success) {
      console.error('[Verification] Claim failed:', claimResult.error);
      return res.status(500).json({ success: false, error: 'Failed to claim verification code' });
    }

    // Send back the claimed token or Roblox info (depending on your flow)
    res.json({
      success: true,
      token: claimResult.record.one_time_token,
      expires_at: claimResult.record.token_expires_at
    });

  } catch (err) {
    console.error('[Verification] Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
