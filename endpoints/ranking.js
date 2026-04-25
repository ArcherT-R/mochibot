const express = require('express');
const axios = require('axios');
const router = express.Router();

// ----------------------------------------
// CONFIGURATION
// ----------------------------------------
const GROUP_ID = '35807738';

// ----------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------

/**
 * Roblox requires a CSRF token for any "write" action (PATCH/POST).
 * We get this by sending a request that will fail with a 403, 
 * then grabbing the token from the response headers.
 */
async function getCsrfToken(cookie) {
  try {
    await axios.post('https://auth.roblox.com/v2/logout', {}, {
      headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
    });
    return null; 
  } catch (err) {
    const token = err.response?.headers['x-csrf-token'];
    if (token) return token;
    throw new Error('Could not fetch CSRF token. The cookie might be expired or invalid.');
  }
}

/**
 * Group APIs often require the internal RoleSetId (a long number) 
 * instead of the Rank Number (1-255). This function converts them.
 */
async function getRoleSetId(rankNumber) {
  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
    const role = res.data.roles.find(r => r.rank === Number(rankNumber));
    if (!role) throw new Error(`Rank number ${rankNumber} does not exist in this group.`);
    return role.id;
  } catch (err) {
    throw new Error(`Failed to map rank to RoleSetId: ${err.message}`);
  }
}

// ----------------------------------------
// MAIN ROUTE
// ----------------------------------------

router.post('/promote', async (req, res) => {
  const { userId, rank } = req.body;
  const cookie = process.env.COOKIE;

  console.log(`[RANKING] Request received for User: ${userId}, Target Rank: ${rank}`);

  // 1. Validate inputs and environment
  if (!cookie) {
    console.error('[RANKING] Critical Error: process.env.COOKIE is missing!');
    return res.status(500).json({ error: 'Server configuration error (missing cookie)' });
  }

  if (!userId || !rank) {
    return res.status(400).json({ error: 'Missing userId or rank in request body' });
  }

  try {
    // 2. Fetch the internal RoleSetId
    console.log('[RANKING] Step 1: Mapping rank number to internal ID...');
    const roleSetId = await getRoleSetId(rank);
    console.log(`[RANKING] Internal RoleSetID found: ${roleSetId}`);

    // 3. Get the X-CSRF-TOKEN
    console.log('[RANKING] Step 2: Fetching CSRF Token...');
    const csrfToken = await getCsrfToken(cookie);
    console.log('[RANKING] CSRF Token acquired.');

    // 4. Perform the Rank Change
    console.log('[RANKING] Step 3: Sending PATCH request to Roblox...');
    const response = await axios.patch(
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

    console.log(`✅ [RANKING] Success: User ${userId} ranked to ${rank}`);
    return res.json({ 
      success: true, 
      message: `User ${userId} has been ranked to ${rank}` 
    });

  } catch (error) {
    // Detailed error logging for Render console
    const robloxError = error.response?.data?.errors?.[0]?.message || error.message;
    console.error(`❌ [RANKING ERROR]: ${robloxError}`);

    return res.status(500).json({ 
      success: false, 
      error: 'Ranking process failed', 
      details: robloxError 
    });
  }
});

module.exports = router;
