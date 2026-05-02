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
	const { userId, username, rank, roleId } = req.body;
	const apiKey = process.env.ROBLOX_API_KEY;

	if (!apiKey) {
		return res.status(500).json({ success: false, error: 'ROBLOX_API_KEY is not set.' });
	}
	if (!userId && !username) {
		return res.status(400).json({ success: false, error: 'Provide either userId or username.' });
	}
	if (!rank && !roleId) {
		return res.status(400).json({ success: false, error: 'Provide either rank or roleId.' });
	}

	try {
		const resolvedUserId     = userId ?? await getUserId(username);
		const resolvedRoleSetId  = roleId ?? (await getRoleSetId(rank)).id;

		// Server-side rank cap — verify against the group roles list
		const rolesRes      = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
		const resolvedRole  = rolesRes.data.roles.find(r => r.id === Number(resolvedRoleSetId));
		if (resolvedRole && resolvedRole.rank > MAX_RANK) {
			return res.status(403).json({
				success: false,
				error: `Rank ${resolvedRole.rank} exceeds the allowed cap of ${MAX_RANK}.`
			});
		}

		await axios.patch(
			`https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${resolvedUserId}`,
			{ role: `groups/${GROUP_ID}/roles/${resolvedRoleSetId}` },
			{
				headers: {
					'x-api-key':     apiKey,
					'Content-Type':  'application/json'
				}
			}
		);

		return res.json({
			success: true,
			message: `Ranked user ${resolvedUserId} to role ${resolvedRoleSetId}.`
		});

	} catch (error) {
		const msg = error.response?.data?.message || error.message;
		return res.status(500).json({ success: false, error: msg });
	}
});

module.exports = router;
