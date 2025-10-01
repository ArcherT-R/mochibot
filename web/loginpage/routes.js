const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');

const router = express.Router();

// Temporary in-memory credentials
// In real usage, this would come from a database or your dashboard
const loginCredentials = [
  // Example: { username: 'Archer', passwordHash: '<hashed password>' }
];

// -------------------- Serve Login Page --------------------
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// -------------------- Login Logic --------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = loginCredentials.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) return res.status(400).json({ error: 'User not found' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'Invalid password' });

  res.json({ success: true });
});

module.exports = router;
