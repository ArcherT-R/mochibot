const axios = require('axios');

let lastLogId = null; 

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    if (!client || !channelId || !cookie) return;

    try {
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${groupId}/audit-log`,
            {
                params: { limit: 10, sortOrder: 'Desc' },
                headers: {
                    'Cookie': `.ROBLOSECURITY=${cookie}`,
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );

        // API FIX: Roblox wraps the logs inside a "data" property
        const logs = response.data && response.data.data;

        if (!logs || !Array.isArray(logs) || logs.length === 0) {
            console.warn(`⚠️ [AUDIT] No logs found. Check bot permissions in Group ${groupId}.`);
            return;
        }

        // Capture the most recent ID (lowercase 'id' is standard for v1)
        const currentLatestId = logs[0].id;

        if (currentLatestId === undefined) {
            console.error('❌ [AUDIT ERROR] id field is missing. Data keys:', Object.keys(logs[0]));
            return;
        }

        // Set the baseline on first run
        if (lastLogId === null) {
            lastLogId = currentLatestId;
            console.log(`✅ [AUDIT] Monitor active for Group ${groupId}. Baseline ID: ${lastLogId}`);
            return;
        }

        // Filter for new logs only
        const newLogs = logs.filter(log => log.id > lastLogId).reverse();
        
        for (const log of newLogs) {
            await sendAuditEmbed(client, channelId, log);
        }

        if (newLogs.length > 0) {
            lastLogId = currentLatestId;
        }

    } catch (err) {
        console.error('❌ [AUDIT ERROR]:', err.response?.data?.errors?.[0]?.message || err.message);
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // Note: TargetDisplayName was added in early 2026 for clarity
        const actorName = log.actor?.user?.username || "Unknown";
        
        const embed = {
            title: '📝 Group Audit Log',
            color: 0x2b2d31,
            author: { name: actorName },
            description: `**Action:** \`${log.actionType}\`\n**Details:** ${log.description || 'No description'}`,
            footer: { text: `Log ID: ${log.id}` },
            timestamp: new Date()
        };

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.warn('Embed failure:', err.message);
    }
}

module.exports = { checkAuditLogs };
