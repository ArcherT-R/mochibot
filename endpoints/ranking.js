const express = require('express');
const axios = require('axios');
const router = express.Router();

const GROUP_ID = '35807738';

// HELPER: Fetch CSRF Token
async function getCsrfToken(cookie) {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
    });
    return null; 
  } catch (err) {
    const token = err.response?.headers['x-csrf-token'];
    if (token) return token;
    throw new Error('CSRF Token failed. Is your cookie valid?');
  }
}

// HELPER: Map Rank (1-255) to RoleSetId
async function getRoleSetId(rankNumber) {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
    // Roblox's new system still uses 'rank' (0-255) for legacy compatibility
    const role = res.data.roles.find(r => r.rank === Number(rankNumber));
    if (!role) throw new Error(`Rank ${rankNumber} not found.`);
    return role.id;
  } catch (err) {
    throw new Error(`Mapping failed: ${err.message}`);
  }
}

router.post('/promote', async (req, res) => {
  const { userId, rank } = req.body;
  const cookie = process.env.COOKIE;

  if (!cookie || !userId || !rank) {
    return res.status(400).json({ error: 'Missing parameters or COOKIE env.' });
  }

  try {
    const roleSetId = await getRoleSetId(rank);
    const csrfToken = await getCsrfToken(cookie);

    // Using the legacy PATCH endpoint. 
    // NOTE: In the new system, this sets the user's "primary" role and 
    // usually removes other non-base roles to maintain the 1-rank feel.
    await axios.patch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
      { roleId: roleSetId },
      {
        headers: {
          'Cookie': `.ROBLOSECURITY=${cookie}`,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.json({ success: true, message: `Ranked ${userId} to ${rank}` });
  } catch (error) {
    const msg = error.response?.data?.errors?.[0]?.message || error.message;
    res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;
