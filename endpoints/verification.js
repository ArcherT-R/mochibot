const express = require('express');
const { claimVerificationCode } = require('./database');
const router = express.Router();

router.post('/game-claim', async (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ success: false, error: 'Missing username or code' });

  try {
    const result = await claimVerificationCode(code, username);
    if (!result.success) return res.status(404).json(result);

    res.json({ success: true, username, password: result.tempPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
