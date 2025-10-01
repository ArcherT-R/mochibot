const express = require('express');
const path = require('path');
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

    // Plain-text password check (use bcrypt in production)
    if (player.password !== password)
      return res.status(401).json({ error: 'Invalid username or password' });

    // ✅ Store player in session
    req.session.player = player;

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
