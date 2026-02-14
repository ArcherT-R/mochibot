const axios = require('axios');

// We track the latest timestamp instead of an ID
let lastLogTimestamp = null; 

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

        const logs = response.data && response.data.data;

        if (!logs || logs.length === 0) return;

        // Use the 'created' field which your debug showed is present
        const currentLatestTimestamp = new Date(logs[0].created).getTime();

        // Baseline: Set the time of the most recent log on startup
        if (lastLogTimestamp === null) {
            lastLogTimestamp = currentLatestTimestamp;
            console.log(`✅ [AUDIT] Monitor active. Starting from: ${logs[0].created}`);
            return;
        }

        // Filter for logs that are strictly NEWER than our last recorded time
        const newLogs = logs.filter(log => new Date(log.created).getTime() > lastLogTimestamp).reverse();
        
        for (const log of newLogs) {
            await sendAuditEmbed(client, channelId, log);
        }

        if (newLogs.length > 0) {
            lastLogTimestamp = currentLatestTimestamp;
        }

    } catch (err) {
        console.error('❌ [AUDIT ERROR]:', err.message);
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const embed = {
            title: '📝 New Group Activity',
            color: 0x2b2d31,
            author: {
                name: log.actor?.user?.username || 'Unknown User',
                icon_url: log.actor?.user?.userId ? `https://www.roblox.com/headshot-thumbnail/image?userId=${log.actor.user.userId}&width=420&height=420&format=png` : null
            },
            fields: [
                { name: 'Action', value: `\`${log.actionType}\``, inline: true },
                { name: 'Rank', value: log.actor?.role?.name || 'N/A', inline: true },
                { name: 'Details', value: log.description || 'No description provided.', inline: false }
            ],
            footer: { text: `Timestamp: ${log.created}` },
            timestamp: new Date(log.created)
        };

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.warn('Discord Embed Error:', err.message);
    }
}

module.exports = { checkAuditLogs };
