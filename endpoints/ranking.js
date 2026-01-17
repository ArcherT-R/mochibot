const express = require('express');
const axios = require('axios');
const router = express.Router();

// ----------------------------------------
// CONFIGURATION
// ----------------------------------------
const GROUP_ID = '35807738';
const ROBLOX_COOKIE = process.env.COOKIE; // Pulls from Render Environment Variables

// ----------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------

async function getCsrfToken() {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${ROBLOX_COOKIE}` }
    });
    return null; 
  } catch (err) {
    if (err.response && err.response.headers['x-csrf-token']) {
      return err.response.headers['x-csrf-token'];
    }
    throw new Error('Could not fetch CSRF token. Check if COOKIE is valid.');
  }
}

async function getRoleSetIdFromRank(targetRank) {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
    const foundRole = res.data.roles.find(r => r.rank === targetRank);
    if (!foundRole) throw new Error(`Rank ${targetRank} not found in group.`);
    return foundRole.id;
  } catch (err) {
    throw new Error(`Failed to fetch roles: ${err.message}`);
  }
}

// ----------------------------------------
// THE FIX: Added 'async' before (req, res)
// ----------------------------------------
router.post('/promote', async (req, res) => {
  const { userId, rank } = req.body;

  if (!ROBLOX_COOKIE) {
    return res.status(500).json({ error: 'COOKIE is missing in Render Environment Variables' });
  }

  try {
    // 1. Get the RoleSet ID for the rank number
    const roleSetId = await getRoleSetIdFromRank(Number(rank));

    // 2. Get the required CSRF token
    const csrfToken = await getCsrfToken();

    // 3. Send the Rank Change Request
    const response = await axios.patch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
      { roleId: roleSetId },
      {
        headers: {
          'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, message: `User ${userId} ranked to ${rank}` });

  } catch (error) {
    console.error('❌ Ranking Error:', error.message);
    res.status(500).json({ 
      error: 'Ranking failed', 
      details: error.response?.data?.errors?.[0]?.message || error.message 
    });
  }
});

module.exports = router;
