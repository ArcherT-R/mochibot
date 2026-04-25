const express = require('express');
const axios = require('axios');
const router = express.Router();

// ----------------------------------------
// CONFIGURATION
// ----------------------------------------
const GROUP_ID = '35807738';
const CLOUD_API_KEY = process.env.ROBLOX_CLOUD_KEY; // Use an API Key, not a cookie!

/**
 * Open Cloud handles roles via "Memberships"
 */
router.post('/update-roles', async (req, res) => {
    const { userId, addRoleId, removeRoleId } = req.body;

    if (!userId || !addRoleId || !removeRoleId) {
        return res.status(400).json({ error: 'Missing userId, addRoleId, or removeRoleId' });
    }

    try {
        console.log(`[RANKING] Updating roles for ${userId}. Adding: ${addRoleId}, Removing: ${removeRoleId}`);

        // 1. ADD the new role
        await axios.post(
            `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${userId}:assign-role`,
            { role: `groups/${GROUP_ID}/roles/${addRoleId}` },
            { headers: { 'x-api-key': CLOUD_API_KEY } }
        );

        // 2. REMOVE the old role
        // Note: If they only had one role, this is crucial to keep the "one rank" feel.
        await axios.post(
            `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${userId}:unassign-role`,
            { role: `groups/${GROUP_ID}/roles/${removeRoleId}` },
            { headers: { 'x-api-key': CLOUD_API_KEY } }
        );

        console.log(`✅ [RANKING] Success: User ${userId} swapped roles.`);
        return res.json({ success: true });

    } catch (error) {
        const robloxError = error.response?.data || error.message;
        console.error(`❌ [RANKING ERROR]:`, robloxError);
        return res.status(500).json({ success: false, details: robloxError });
    }
});

module.exports = router;
