const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const GROUP_ID = process.env.GROUP_ID || '35807738';
const MAX_RANK = 5;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;

async function sendDiscordLog(rankName, userId) {
    if (!WEBHOOK_URL) return;
    try {
        await axios.post(WEBHOOK_URL, {
            embeds: [{
                title: 'Player Ranked',
                color: 0x00aa00,
                fields: [
                    { name: 'User ID',   value: String(userId), inline: true },
                    { name: 'New Rank',  value: rankName,       inline: true },
                ],
                timestamp: new Date().toISOString()
            }]
        });
    } catch (err) {
        console.warn('[WEBHOOK] Discord log failed:', err.message);
    }
}

router.post('/promote', async (req, res) => {
    const { userId, currentRank, steps } = req.body;
    const apiKey = process.env.ROBLOX_API_KEY;

    if (!apiKey)
        return res.status(500).json({ success: false, error: 'ROBLOX_API_KEY not set.' });
    if (!userId)
        return res.status(400).json({ success: false, error: 'Missing userId.' });
    if (currentRank === undefined)
        return res.status(400).json({ success: false, error: 'Missing currentRank.' });

    try {
        // Fetch and sort group roles
        const rolesRes = await axios.get(`https://groups.roblox.com/v1/groups/${GROUP_ID}/roles`);
        const roles = rolesRes.data.roles.sort((a, b) => a.rank - b.rank);

        // Find the player's current role index
        let currentIndex = 0;
        for (let i = 0; i < roles.length; i++) {
            if (roles[i].rank === Number(currentRank)) {
                currentIndex = i;
                break;
            }
        }

        // Step up by requested amount
        const targetIndex = Math.min(currentIndex + (Number(steps) || 1), roles.length - 1);
        const targetRole  = roles[targetIndex];

        // Rank cap
        if (targetRole.rank > MAX_RANK) {
            return res.status(403).json({
                success: false,
                error: `Rank ${targetRole.rank} exceeds the allowed cap of ${MAX_RANK}.`
            });
        }

        // Promote via Roblox Open Cloud
        await axios.patch(
            `https://apis.roblox.com/cloud/v2/groups/${GROUP_ID}/memberships/${userId}`,
            { role: `groups/${GROUP_ID}/roles/${targetRole.id}` },
            {
                headers: {
                    'x-api-key':    apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        await sendDiscordLog(targetRole.name, userId);

        console.log(`[RANKING] Ranked user ${userId} to ${targetRole.name} (rank ${targetRole.rank})`);

        return res.json({
            success:  true,
            rankName: targetRole.name,
            message:  `Ranked user ${userId} to ${targetRole.name}.`
        });

    } catch (error) {
        const msg = error.response?.data?.message || error.message;
        console.error('[RANKING] Error:', msg);
        return res.status(500).json({ success: false, error: msg });
    }
});

module.exports = router;
