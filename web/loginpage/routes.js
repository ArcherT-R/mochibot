// web/loginpage/routes.js
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getPlayerByUsername } = require('../../endpoints/database');

const router = express.Router();

// -------------------- Serve HTML --------------------
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// -------------------- Login --------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const player = await getPlayerByUsername(username);
    if (!player) return res.status(400).json({ error: 'User not found' });

    const passwordHash = player.password_hash;
    if (!passwordHash) return res.status(400).json({ error: 'Password not set for this user' });

    const match = await bcrypt.compare(password, passwordHash);
    if (!match) return res.status(400).json({ error: 'Invalid password' });

    // Success
    res.json({ success: true, username: player.username, roblox_id: player.roblox_id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
