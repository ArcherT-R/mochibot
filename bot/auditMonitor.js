const axios = require('axios');

let lastLogId = null; 

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    if (!client || !channelId || !cookie) return;

    try {
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${groupId}/audit-log?limit=20&sortOrder=Desc`,
            {
                headers: {
                    'Cookie': `.ROBLOSECURITY=${cookie}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Referer': `https://www.roblox.com/groups/${groupId}/configure#!/auditLog`
                }
            }
        );

        const logs = response.data.data;
        if (!logs || logs.length === 0) return;

        // Baseline on first run
        if (lastLogId === null) {
            lastLogId = logs[0].id;
            console.log(`[AUDIT] Monitor started. Baseline ID: ${lastLogId}`);
            return;
        }

        // Filter for ONLY logs newer than our last check
        const newLogs = logs.filter(log => log.id > lastLogId).reverse();
        
        for (const log of newLogs) {
            await sendAuditEmbed(client, channelId, log);
        }

        if (newLogs.length > 0) {
            lastLogId = newLogs[0].id;
        }

    } catch (err) {
        if (err.response?.status === 403) {
            console.error('❌ [AUDIT ERROR] 403: Bot lacks "View Audit Log" permission in Group Settings.');
        } else {
            console.error('❌ [AUDIT ERROR]:', err.message);
        }
    }
}

async function sendAuditEmbed(client, channelId, log) {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    // Determine if this specific log is "Suspicious" to change the color
    const suspiciousActions = ['DeletePost', 'RemoveMember', 'SpendGroupFunds', 'DeleteAlly', 'BanMember'];
    const isSuspicious = suspiciousActions.includes(log.actionType);

    const embed = {
        title: isSuspicious ? '🚩 Suspicious Activity Detected' : '📝 New Audit Log Entry',
        color: isSuspicious ? 0xff0000 : 0x2f3136, // Red for suspicious, Dark Grey for normal
        author: {
            name: log.actor.user.username,
            icon_url: `https://www.roblox.com/headshot-thumbnail/image?userId=${log.actor.user.userId}&width=420&height=420&format=png`
        },
        fields: [
            { name: 'Action', value: `\`${log.actionType}\``, inline: true },
            { name: 'Rank', value: log.actor.role.name, inline: true },
            { name: 'Description', value: log.description || 'No extra details', inline: false }
        ],
        footer: { text: `User ID: ${log.actor.user.userId} | Log ID: ${log.id}` },
        timestamp: new Date()
    };

    await channel.send({ embeds: [embed] });
}

module.exports = { checkAuditLogs };
