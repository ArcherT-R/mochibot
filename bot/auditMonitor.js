const axios = require('axios');

let lastLogTimestamp = null; 

async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    // Safety: ensure we have a valid group ID string
    const targetGroup = groupId || '35807738'; 

    if (!client || !channelId || !cookie) return;

    try {
        const response = await axios.get(
            `https://groups.roblox.com/v1/groups/${targetGroup}/audit-log`,
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

        const newestLogTime = new Date(logs[0].created).getTime();

        if (lastLogTimestamp === null) {
            lastLogTimestamp = newestLogTime;
            console.log(`✅ [AUDIT] Monitor started. Baseline set to: ${logs[0].created}`);
            return;
        }

        const newLogs = logs.filter(log => new Date(log.created).getTime() > lastLogTimestamp);

        if (newLogs.length > 0) {
            newLogs.sort((a, b) => new Date(a.created) - new Date(b.created));
            for (const log of newLogs) {
                await sendAuditEmbed(client, channelId, log);
            }
            lastLogTimestamp = newestLogTime;
        }

    } catch (err) {
        // Detailed Error Logging
        if (err.response?.status === 400) {
            console.error(`❌ [AUDIT ERROR 400]: Bad Request. Check if the Cookie is still valid or if the bot was kicked from the group.`);
        } else if (err.response?.status === 429) {
            console.warn(`⚠️ [AUDIT WARNING]: Rate limited by Roblox. Slowing down...`);
        } else {
            console.error('❌ [AUDIT ERROR]:', err.message);
        }
    }
}

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const embed = {
            title: '📝 Group Audit Log',
            color: 0x2b2d31,
            description: `**Action:** \`${log.actionType}\`\n**Actor:** ${log.actor?.user?.username}\n**Details:** ${log.description || 'N/A'}`,
            timestamp: new Date(log.created)
        };

        await channel.send({ embeds: [embed] });
    } catch (e) {
        console.error("Embed error:", e.message);
    }
}

module.exports = { checkAuditLogs };
