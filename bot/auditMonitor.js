const axios = require('axios');

let lastLogId = null; // Tracks the most recent log seen to avoid duplicates

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    if (!client || !channelId) return;

    try {
        // Fetch the last 10 audit log entries
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${groupId}/audit-log?limit=10&sortOrder=Desc`,
            { headers: { Cookie: `.ROBLOSECURITY=${cookie}` } }
        );

        const logs = response.data.data;
        if (!logs || logs.length === 0) return;

        // On first run, just set the baseline ID
        if (!lastLogId) {
            lastLogId = logs[0].id;
            return;
        }

        const newLogs = logs.filter(log => log.id > lastLogId);
        
        for (const log of newLogs) {
            if (isSuspicious(log)) {
                await sendAlert(client, channelId, log);
            }
        }

        if (newLogs.length > 0) {
            lastLogId = newLogs[0].id;
        }

    } catch (err) {
        console.error('Audit Log Error:', err.message);
    }
}

function isSuspicious(log) {
    const suspiciousActions = [
        'DeletePost', 
        'RemoveMember', 
        'ChangeRank', 
        'SpendGroupFunds', 
        'DeleteAlly'
    ];
    
    // Logic: Flag if action is in the list OR if someone ranks a high-rank user
    // You can customize this further (e.g., check if user is ranking someone to 'Owner')
    return suspiciousActions.includes(log.actionType);
}

async function sendAlert(client, channelId, log) {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const embed = {
        title: '🚩 Suspicious Audit Activity',
        color: 0xff0000, // Red
        fields: [
            { name: 'User', value: `[${log.actor.user.username}](https://www.roblox.com/users/${log.actor.user.userId}/profile)`, inline: true },
            { name: 'Action', value: `\`${log.actionType}\``, inline: true },
            { name: 'Description', value: log.description || 'No details provided' }
        ],
        timestamp: new Date()
    };

    await channel.send({ embeds: [embed] });
}

module.exports = { checkAuditLogs };
