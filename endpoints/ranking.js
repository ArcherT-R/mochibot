// endpoints/ranking.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// The target group ID provided
const GROUP_ID = '35807738';

/**
 * Helper to get current X-CSRF-TOKEN
 * Roblox requires us to request it, fail (403), grab the token from headers, and retry.
 */
async function getCsrfToken(cookie) {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
    });
    return null; // Should not happen if cookie is valid/session active
  } catch (err) {
    if (err.response && err.response.headers['x-csrf-token']) {
      return err.response.headers['x-csrf-token'];
    }
    // If we can't get a token, the cookie might be invalid
    throw new Error('Invalid Roblox Cookie or unable to fetch CSRF token');
  }
}

/**
 * POST /ranking/promote
 * Body: { "userId": 12345, "roleId": 5, "cookie": "..." }
 * Note: 'roleId' is the Rank ID (1-255), not the RoleSet ID usually. 
 * If you specifically need RoleSet ID, the API endpoint is slightly different.
 */
router.post('/set-rank', async (req, res) => {
  const { userId, roleId, cookie } = req.body;

  if (!userId || !roleId || !cookie) {
    return res.status(400).json({ error: 'Missing userId, roleId, or cookie' });
  }

  try {
    // 1. Get the CSRF Token first
    const csrfToken = await getCsrfToken(cookie);
    
    // 2. Perform the Rank Change Request
    // Docs: https://groups.roblox.com/docs/#!/Membership/patch_v1_groups_groupId_users_userId
    const response = await axios.patch(
      `https://groups.roblox.com/v1/groups/${GROUP_ID}/users/${userId}`,
      { roleId: roleId }, // This sets the rank
      {
        headers: {
          'Cookie': `.ROBLOSECURITY=${cookie}`,
          'X-CSRF-TOKEN': csrfToken,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Ranked user ${userId} to role ${roleId} successfully.`);
    return res.json({ 
      success: true, 
      data: response.data 
    });

  } catch (error) {
    console.error('❌ Ranking Error:', error.response ? error.response.data : error.message);
    
    const statusCode = error.response ? error.response.status : 500;
    const errorMsg = error.response && error.response.data && error.response.data.errors 
      ? error.response.data.errors[0].message 
      : error.message;

    return res.status(statusCode).json({ 
      success: false, 
      error: errorMsg 
    });
  }
});

module.exports = router;
