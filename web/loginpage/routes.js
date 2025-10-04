const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getPlayerByUsername } = require('../../endpoints/database');

const router = express.Router();

// Serve HTML login page
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Login handler
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const player = await getPlayerByUsername(username);
    if (!player)
      return res.status(401).json({ error: 'Invalid username or password' });

    // Check plain password first
    let isValid = false;

    if (player.password && player.password === password) {
      isValid = true;
    } else if (player.password_hash) {
      isValid = await bcrypt.compare(password, player.password_hash);
    }

    if (!isValid)
      return res.status(401).json({ error: 'Invalid username or password' });

    // ✅ Explicitly store only the fields we need in session
    req.session.player = {
      roblox_id: player.roblox_id,
      username: player.username,
      group_rank: player.group_rank // e.g., "Vice Chairman"
    };

    res.json({ success: true, message: 'Logged in successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.json({ success: true, message: 'Logged out' });
  });
});

module.exports = router;
