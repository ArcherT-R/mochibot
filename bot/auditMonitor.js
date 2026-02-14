const axios = require('axios');

// Persistent timestamp to track the last processed log
let lastLogTimestamp = null; 

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    if (!client || !channelId || !cookie) return;

    try {
        // Fetch the last 20 logs to ensure no gaps during bursts
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${groupId}/audit-log`,
            {
                params: { limit: 20, sortOrder: 'Desc' },
                headers: {
                    'Cookie': `.ROBLOSECURITY=${cookie}`,
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            }
        );

        const logs = response.data && response.data.data;

        if (!logs || logs.length === 0) return;

        // The timestamp of the absolute newest log in the list
        const newestLogTime = new Date(logs[0].created).getTime();

        // -------------------------------------------------------
        // BASELINE: First run since server start
        // -------------------------------------------------------
        if (lastLogTimestamp === null) {
            lastLogTimestamp = newestLogTime;
            console.log(`✅ [AUDIT] Monitor started. Baseline set to: ${logs[0].created}`);
            return;
        }

        // -------------------------------------------------------
        // FILTER: Get only logs NEWER than our saved timestamp
        // -------------------------------------------------------
        const newLogs = logs.filter(log => {
            const logTime = new Date(log.created).getTime();
            return logTime > lastLogTimestamp;
        });

        if (newLogs.length > 0) {
            console.log(`🆕 [AUDIT] Found ${newLogs.length} new actions. Processing...`);

            // Sort them Oldest -> Newest so they appear in Discord in order
            newLogs.sort((a, b) => new Date(a.created) - new Date(b.created));

            for (const log of newLogs) {
                await sendAuditEmbed(client, channelId, log);
            }

            // Update our marker to the latest one we processed
            lastLogTimestamp = newestLogTime;
        }

    } catch (err) {
        console.error('❌ [AUDIT ERROR]:', err.message);
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const actorName = log.actor?.user?.username || "System/Unknown";
        
        const embed = {
            title: '📝 Group Audit Log',
            color: 0x2b2d31,
            author: {
                name: actorName,
                icon_url: log.actor?.user?.userId ? `https://www.roblox.com/headshot-thumbnail/image?userId=${log.actor.user.userId}&width=420&height=420&format=png` : null
            },
            fields: [
                { name: 'Action', value: `\`${log.actionType}\``, inline: true },
                { name: 'Rank', value: log.actor?.role?.name || 'N/A', inline: true },
                { name: 'Details', value: log.description || '_No description provided_', inline: false }
            ],
            footer: { text: `Time (UTC): ${log.created}` },
            timestamp: new Date(log.created)
        };

        await channel.send({ embeds: [embed] });
    } catch (err) {
        console.warn('⚠️ Embed failed:', err.message);
    }
}

module.exports = { checkAuditLogs };
