const express = require('express');
const router = express.Router();
const axios = require('axios');

// -------------------- Roblox Verification --------------------
// Example usage: POST /loginpage/verify-roblox { "username": "ArcherTheProFYT" }

router.post('/verify-roblox', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    // Modern Roblox API endpoint
    const response = await axios.get(`https://users.roblox.com/v1/users/by-username/${encodeURIComponent(username)}`);

    if (response.data && response.data.id) {
      // User exists, return Roblox ID and username
      return res.json({
        success: true,
        robloxId: response.data.id,
        robloxUsername: response.data.name
      });
    } else {
      return res.status(404).json({ error: 'Roblox user not found' });
    }

  } catch (err) {
    // Handle 404 from Roblox API (user not found)
    if (err.response && err.response.status === 404) {
      return res.status(404).json({ error: 'Roblox user not found' });
    }

    console.error('Roblox API error:', err.message);
    return res.status(500).json({ error: 'Could not reach Roblox API' });
  }
});

module.exports = router;
