const axios = require('axios');

let lastLogId = null; 

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    // We don't need to "require" client because it's passed in the parameters above!
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

        const logs = response.data?.data;
        if (!logs || logs.length === 0) return;

        const currentLatestId = logs[0].id;

        if (lastLogId === null) {
            lastLogId = currentLatestId;
            console.log(`✅ [AUDIT] Monitor active. Baseline: ${lastLogId}`);
            return;
        }

        const newLogs = logs.filter(log => log.id > lastLogId).reverse();
        for (const log of newLogs) {
            await sendAuditEmbed(client, channelId, log);
        }

        if (newLogs.length > 0) lastLogId = currentLatestId;

    } catch (err) {
        console.error('❌ [AUDIT ERROR]:', err.message);
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const embed = {
            title: '📝 Group Audit Log',
            color: 0x2b2d31,
            description: `**Action:** ${log.actionType}\n**User:** ${log.actor.user.username}\n**Details:** ${log.description || 'None'}`,
            timestamp: new Date()
        };

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.warn('Embed error:', err.message);
    }
}

module.exports = { checkAuditLogs };
