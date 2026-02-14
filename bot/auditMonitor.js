const axios = require('axios');

let lastLogId = null; 

/**
 * Main function to poll Roblox Audit Logs
 */
async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    if (!client || !channelId || !cookie) {
        if (!channelId) console.warn('⚠️ AUDIT_LOG_CHANNEL_ID missing in .env');
        return;
    }

    try {
        // We use params object to ensure axios formats the URL query string correctly (prevents 400 errors)
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${groupId}/audit-log`,
            {
                params: {
                    limit: 10,
                    sortOrder: 'Desc'
                },
                headers: {
                    'Cookie': `.ROBLOSECURITY=${cookie}`,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            }
        );

        const logs = response.data.data;
        if (!logs || logs.length === 0) return;

        // Baseline: Ignore all previous logs when the server starts
        if (lastLogId === null) {
            lastLogId = logs[0].id;
            console.log(`✅ [AUDIT] Monitoring started for Group ${groupId}. Baseline ID: ${lastLogId}`);
            return;
        }

        // Get logs that happened AFTER our last check
        const newLogs = logs.filter(log => log.id > lastLogId).reverse();
        
        for (const log of newLogs) {
            await sendAuditEmbed(client, channelId, log);
        }

        if (newLogs.length > 0) {
            lastLogId = newLogs[0].id;
        }

    } catch (err) {
        if (err.response) {
            // Status 400 = Bad GroupID or bad parameters
            // Status 403 = No permissions/Bad Cookie
            console.error(`❌ [AUDIT ERROR] ${err.response.status}:`, err.response.data.errors?.[0]?.message || 'Unknown Error');
        } else {
            console.error('❌ [AUDIT ERROR]:', err.message);
        }
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        // Define what we consider "Suspicious"
        const suspiciousActions = ['DeletePost', 'RemoveMember', 'SpendGroupFunds', 'DeleteAlly', 'BanMember'];
        const isSuspicious = suspiciousActions.includes(log.actionType);

        const embed = {
            title: isSuspicious ? '🚩 Suspicious Action Detected' : '📝 Group Audit Log',
            color: isSuspicious ? 0xff0000 : 0x2b2d31,
            author: {
                name: log.actor.user.username,
                icon_url: `https://www.roblox.com/headshot-thumbnail/image?userId=${log.actor.user.userId}&width=420&height=420&format=png`
            },
            fields: [
                { name: 'Action', value: `\`${log.actionType}\``, inline: true },
                { name: 'Actor Rank', value: log.actor.role.name, inline: true },
                { name: 'Description', value: log.description || '_No description provided_', inline: false }
            ],
            footer: { text: `Log ID: ${log.id} | Actor ID: ${log.actor.user.userId}` },
            timestamp: new Date()
        };

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.error('Failed to send Discord embed:', err.message);
    }
}

module.exports = { checkAuditLogs };
