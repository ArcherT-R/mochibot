const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');

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

// -------------------- Signup flow --------------------
router.post('/start-signup', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  const key = username.toLowerCase();

  if (loginCredentials.find(u => u.username.toLowerCase() === key)) {
    return res.status(400).json({ error: 'User already registered' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  pendingVerifications[key] = {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    verified: false
  };

  console.log(`📩 Generated verification code ${code} for ${username}`);
  res.json({ success: true });
});

// -------------------- Verify Code --------------------
router.post('/verify-code', (req, res) => {
  const { username, code } = req.body;
  const key = username.toLowerCase();
  const entry = pendingVerifications[key];

  if (!entry) return res.status(400).json({ error: 'No pending verification' });
  if (entry.verified) return res.status(400).json({ error: 'Already verified' });
  if (Date.now() > entry.expiresAt) return res.status(400).json({ error: 'Code expired' });
  if (entry.code !== code) return res.status(400).json({ error: 'Invalid code' });

  entry.verified = true;
  res.json({ success: true });
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
