// src/endpoints/verification.js
const express = require('express');
const router = express.Router();
const db = require('./database');
const crypto = require('crypto');

// Helper: generate a 6-digit numeric code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// -------------------------
// Create / Generate a verification code
// POST /verify/generate
// Body: { roblox_id, username }
// -------------------------
router.post('/generate', async (req, res) => {
  try {
    const { roblox_id, username } = req.body;
    if (!roblox_id || !username) {
      return res.status(400).json({ success: false, error: 'Missing roblox_id or username' });
    }

    const code = generateCode();

    // Save code to Supabase
    await db.addVerificationCode(roblox_id, code);

    // Return code (in production, you might DM it to Discord or send via other method)
    res.json({ success: true, code });
  } catch (err) {
    console.error('[Verification Generate] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------
// Verify a code
// POST /verify/confirm
// Body: { roblox_id, code }
// -------------------------
router.post('/confirm', async (req, res) => {
  try {
    const { roblox_id, code } = req.body;
    if (!roblox_id || !code) {
      return res.status(400).json({ success: false, error: 'Missing roblox_id or code' });
    }

    const entry = await db.getVerificationCode(roblox_id, code);

    if (!entry) {
      return res.status(400).json({ success: false, error: 'Invalid code or already used' });
    }

    // Delete the code after successful verification
    await db.deleteVerificationCode(roblox_id, code);

    // You can also mark the player as verified in your "players" table if needed
    res.json({ success: true, message: 'Verification successful' });
  } catch (err) {
    console.error('[Verification Confirm] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
