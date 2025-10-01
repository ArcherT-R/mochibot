const express = require('express');
const path = require('path');
const { getPlayerByUsername } = require('../../endpoints/database');

const router = express.Router();

// -------------------- Serve HTML --------------------
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// -------------------- Login --------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const player = await getPlayerByUsername(username);

    if (!player) return res.status(401).json({ error: 'Invalid username or password' });

    // Plain-text password check
    if (player.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ success: true, message: 'Logged in successfully', player });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
