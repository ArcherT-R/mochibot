const axios = require('axios');

let lastLogId = null; 

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    if (!client || !channelId || !cookie) return;

    try {
        // Fetch logs using lowercase 'id' as per Roblox v1 API standards
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${groupId}/audit-log`,
            {
                params: { limit: 10, sortOrder: 'Desc' },
                headers: {
                    'Cookie': `.ROBLOSECURITY=${cookie}`,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            }
        );

        const logs = response.data.data;
        if (!logs || logs.length === 0) return;

        // Correctly capture the ID (Roblox uses lowercase 'id')
        const currentLatestId = logs[0].id;

        if (lastLogId === null) {
            lastLogId = currentLatestId;
            console.log(`✅ [AUDIT] Monitoring active for Group ${groupId}. Baseline ID: ${lastLogId}`);
            return;
        }

        // Filter for logs newer than our last check
        const newLogs = logs.filter(log => log.id > lastLogId).reverse();
        
        for (const log of newLogs) {
            await sendAuditEmbed(client, channelId, log);
        }

        if (newLogs.length > 0) {
            lastLogId = newLogs[0].id;
        }

    } catch (err) {
        if (err.response?.status === 400) {
            console.error('❌ [AUDIT ERROR] 400: Bad Request. Check if Group ID is correct.');
        } else if (err.response?.status === 403) {
            console.error('❌ [AUDIT ERROR] 403: Forbidden. Bot account needs "View Audit Log" permission.');
        } else {
            console.error('❌ [AUDIT ERROR]:', err.message);
        }
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const suspiciousActions = ['DeletePost', 'RemoveMember', 'SpendGroupFunds', 'DeleteAlly', 'BanMember'];
        const isSuspicious = suspiciousActions.includes(log.actionType);

        const embed = {
            title: isSuspicious ? '🚩 Suspicious Activity Detected' : '📝 New Audit Log Entry',
            color: isSuspicious ? 0xff0000 : 0x2b2d31,
            author: {
                name: log.actor.user.username,
                icon_url: `https://www.roblox.com/headshot-thumbnail/image?userId=${log.actor.user.userId}&width=420&height=420&format=png`
            },
            fields: [
                { name: 'Action', value: `\`${log.actionType}\``, inline: true },
                { name: 'Rank', value: log.actor.role.name, inline: true },
                { name: 'Description', value: log.description || 'No details', inline: false }
            ],
            footer: { text: `User ID: ${log.actor.user.userId} | Log ID: ${log.id}` },
            timestamp: new Date()
        };

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.warn('Embed failed:', err.message);
    }
}

module.exports = { checkAuditLogs };
