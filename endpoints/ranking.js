const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const GROUP_ID = process.env.GROUP_ID || '35807738';
const MAX_RANK = 5;

async function getUserId(username) {
	const res = await axios.post('https://users.roblox.com/v1/usernames/users', {
		usernames: [username],
		excludeBannedUsers: true
	});
	const user = res.data?.data?.[0];
	if (!user) throw new Error(`User "${username}" not found.`);
	return user.id;
}

async function getRoleSetId(rankNumber) {
	const res = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
	const role = res.data.roles.find(r => r.rank === Number(rankNumber));
	if (!role) throw new Error(`Rank ${rankNumber} not found in group ${GROUP_ID}.`);
	return { id: role.id, rank: role.rank };
}

router.post('/promote', async (req, res) => {
    const { userId, currentRank, steps } = req.body;
    const apiKey = process.env.ROBLOX_API_KEY;

    if (!apiKey)    return res.status(500).json({ success: false, error: 'ROBLOX_API_KEY not set.' });
    if (!userId)    return res.status(400).json({ success: false, error: 'Missing userId.' });
    if (currentRank === undefined) return res.status(400).json({ success: false, error: 'Missing currentRank.' });

    try {
        // Fetch roles — backend can access this endpoint freely
        const rolesRes = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
        const roles = rolesRes.data.roles.sort((a, b) => a.rank - b.rank);

        // Find current index
        let currentIndex = 0;
        for (let i = 0; i < roles.length; i++) {
            if (roles[i].rank === Number(currentRank)) { currentIndex = i; break; }
        }

        // Step up
        const targetIndex = Math.min(currentIndex + (Number(steps) || 1), roles.length - 1);
        const targetRole  = roles[targetIndex];

        // Cap check
        if (targetRole.rank > MAX_RANK) {
            return res.status(403).json({ success: false, error: `Rank ${targetRole.rank} exceeds cap of ${MAX_RANK}.` });
        }

        // Promote via Open Cloud
        await axios.patch(
            `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${userId}`,
            { role: `groups/${GROUP_ID}/roles/${targetRole.id}` },
            { headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' } }
        );

        return res.json({ success: true, rankName: targetRole.name, message: `Ranked user ${userId} to ${targetRole.name}.` });

    } catch (error) {
        const msg = error.response?.data?.message || error.message;
        return res.status(500).json({ success: false, error: msg });
    }
});

module.exports = router;
