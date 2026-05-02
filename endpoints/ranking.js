const express = require('express');
const axios = require('axios');
const router = express.Router();

const GROUP_ID = process.env.GROUP_ID || '35807738';

// HELPER: Resolve a username to a Roblox User ID
async function getUserId(username) {
  try {
    const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
      usernames: [username],
      excludeBannedUsers: true
    });
    const user = res.data?.data?.[0];
    if (!user) throw new Error(`User "${username}" not found.`);
    return user.id;
  } catch (err) {
    throw new Error(`Username resolution failed: ${err.message}`);
  }
}

// HELPER: Map rank number (1-255) to a RoleSet ID
async function getRoleSetId(rankNumber) {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
    const role = res.data.roles.find(r => r.rank === Number(rankNumber));
    if (!role) throw new Error(`Rank ${rankNumber} not found in group ${GROUP_ID}.`);
    return role.id;
  } catch (err) {
    throw new Error(`Role mapping failed: ${err.message}`);
  }
}

router.post('/promote', async (req, res) => {
  // Accept either a userId directly or a username to resolve
  const { userId, username, rank, roleId } = req.body;
  const apiKey = process.env.ROBLOX_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'ROBLOX_API_KEY env variable is not set.' });
  }
  if (!userId && !username) {
    return res.status(400).json({ error: 'Provide either userId or username.' });
  }
  if (!rank && !roleId) {
    return res.status(400).json({ error: 'Provide either rank (1-255) or roleId directly.' });
  }

  try {
    // Resolve userId from username if needed
    const resolvedUserId = userId ?? await getUserId(username);

    // Resolve roleSetId from rank number if needed, otherwise use roleId directly
    const resolvedRoleSetId = roleId ?? await getRoleSetId(rank);

    // Open Cloud v2 — no CSRF or cookie required, just the API key
    await axios.patch(
      `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${resolvedUserId}`,
      {
        role: `groups/${GROUP_ID}/roles/${resolvedRoleSetId}`
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.json({
      success: true,
      message: `Ranked user ${resolvedUserId} to role ${resolvedRoleSetId}`
    });

  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    return res.status(500).json({ success: false, error: msg });
  }
});

module.exports = router;
