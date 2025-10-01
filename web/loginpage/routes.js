const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const router = express.Router();

// -------------------- In-memory stores --------------------
const pendingVerifications = {}; // { username: { code, expiresAt, verified } }
const loginCredentials = [];     // { username, passwordHash }

// -------------------- Serve HTML pages --------------------
router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

router.get('/verify-code', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify-code.html'));
});

router.get('/set-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'set-password.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// -------------------- Start Signup --------------------
router.post('/start-signup', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const key = username.toLowerCase();
  if (loginCredentials.find(u => u.username.toLowerCase() === key)) {
    return res.status(400).json({ error: 'User already registered' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingVerifications[key] = {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min expiry
    verified: false
  };

  console.log(`📩 Verification code for ${username}: ${code}`);
  res.json({ success: true, code }); // For testing, normally just tell user to copy code
});

// -------------------- Verify Roblox Profile --------------------
router.post('/verify-roblox', async (req, res) => {
  const { username, code } = req.body;
  if (!username || !code) return res.status(400).json({ error: 'Missing username or code' });

  const key = username.toLowerCase();
  const entry = pendingVerifications[key];
  if (!entry) return res.status(400).json({ error: 'No pending verification' });
  if (entry.verified) return res.status(400).json({ error: 'Already verified' });
  if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'Code expired' });

  try {
    // Roblox API check
    const userRes = await axios.get(`https://api.roblox.com/users/get-by-username?username=${username}`);
    const userId = userRes.data.Id;
    const profileRes = await axios.get(`https://users.roblox.com/v1/users/${userId}`);
    const description = profileRes.data.description || "";

    if (!description.includes(code)) {
      return res.status(400).json({ error: 'Code not found in Roblox profile' });
    }

    entry.verified = true;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to verify Roblox profile' });
  }
});

// -------------------- Set Password --------------------
router.post('/set-password', async (req, res) => {
  const { username, password } = req.body;
  const key = username.toLowerCase();
  const entry = pendingVerifications[key];

  if (!entry || !entry.verified) return res.status(400).json({ error: 'User not verified' });

  const passwordHash = await bcrypt.hash(password, 10);
  loginCredentials.push({ username, passwordHash });

  console.log(`✅ ${username} set a password and is now registered`);
  delete pendingVerifications[key];
  res.json({ success: true });
});

// -------------------- Login --------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = loginCredentials.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) return res.status(400).json({ error: 'User not found' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: 'Invalid password' });

  res.json({ success: true });
});

module.exports = router;
