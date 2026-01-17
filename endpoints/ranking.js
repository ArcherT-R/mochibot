const express = require('express');
const axios = require('axios');
const router = express.Router();

// ----------------------------------------
// CONFIGURATION
// ----------------------------------------
const GROUP_ID = '35807738';
const ROBLOX_COOKIE = process.env.COOKIE; // Loaded from Render Secrets

// ----------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------

// 1. Get X-CSRF-TOKEN (Required for all data-changing Roblox requests)
async function getCsrfToken() {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${ROBLOX_COOKIE}` }
    });
    return null; 
  } catch (err) {
    // The token is returned in the x-csrf-token header of the 403 response
    if (err.response && err.response.headers['x-csrf-token']) {
      return err.response.headers['x-csrf-token'];
    }
    throw new Error('Could not fetch CSRF token. Check if COOKIE is valid in Render Secrets.');
  }
}

// 2. Convert Rank (1-255) to the required RoleSet ID
async function getRoleSetIdFromRank(targetRank) {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
    const roles = res.data.roles;
    
    // Find the role with the matching rank number
    const foundRole = roles.find(r => r.rank === targetRank);
    
    if (!foundRole) throw new Error(`Rank ${targetRank} does not exist in group ${GROUP_ID}`);
    return foundRole.id; // This is the ID we need for the API
  } catch (err) {
    throw new Error(`Failed to fetch group roles: ${err.message}`);
  }
}

// ----------------------------------------
// ROUTES
// ----------------------------------------

/**
 * POST /ranking/promote
 * Usage: Send JSON { "userId": 12345, "rank": 10 }
 */
router.post('/promote', async (req, res) => {
  const { userId, rank } = req.body;

  // Basic Validation
  if (!ROBLOX_COOKIE) return res.status(500).json({ error: 'Server missing COOKIE in secrets' });
  if (!userId || !rank) return res.status(400).json({ error: 'Missing userId or rank' });

  try {
    // Step A: Get the RoleSet ID (Converts "10" to "9382103")
    const roleSetId = await getRoleSetIdFromRank(Number(rank));

    // Step B: Get CSRF Token
    const csrfToken = await getCsrfToken();

    // Step C: Send the Rank Change Request
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

    console.log(`✅ Ranked User: ${userId} to Rank: ${rank}`);
    res.json({ success: true, newRank: rank });

  } catch (error) {
    console.error('❌ Ranking Failed:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Ranking failed', 
      details: error.response?.data?.errors?.[0]?.message || error.message 
    });
  }
});

module.exports = router;  if (!userId || !roleId || !cookie) {
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
