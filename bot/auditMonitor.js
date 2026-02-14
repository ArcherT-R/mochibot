const axios = require('axios');

// Tracks the last processed log timestamp to prevent duplicates
let lastLogTimestamp = null; 

/**
 * Main function to check Roblox Audit Logs
 */
async function checkAuditLogs(client, groupId) {
    const channelId = process.env.AUDIT_LOG_CHANNEL_ID;
    const cookie = process.env.COOKIE;

    // Safety check for required credentials
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

        const newestLogTime = new Date(logs[0].created).getTime();

        // Initial setup: Set the baseline so we don't spam old logs on restart
        if (lastLogTimestamp === null) {
            lastLogTimestamp = newestLogTime;
            console.log(`✅ [AUDIT] Monitor active. Baseline: ${logs[0].created}`);
            return;
        }

        // Filter for any logs created AFTER our last check
        const newLogs = logs.filter(log => new Date(log.created).getTime() > lastLogTimestamp);

        if (newLogs.length > 0) {
            console.log(`🆕 [AUDIT] Processing ${newLogs.length} new log(s).`);
            
            // Sort oldest to newest for chronological Discord posting
            newLogs.sort((a, b) => new Date(a.created) - new Date(b.created));

            for (const log of newLogs) {
                await sendAuditEmbed(client, channelId, log);
            }

            // Update baseline to the latest log processed
            lastLogTimestamp = newestLogTime;
        }

    } catch (err) {
        if (err.response?.status === 400) {
            console.error('❌ [ROBLOX 400]: Check your Cookie or Group ID.');
        } else {
            console.error('❌ [AUDIT ERROR]:', err.message);
        }
    }
}

/**
 * Formats and sends the Discord Embed
 */
async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const isRankChange = log.actionType === 'ChangeRank';
        const actorName = log.actor?.user?.username || "System";
        const skyBlue = 0x87CEEB;

        // Create the clean timestamp for the footer
        const dateObj = new Date(log.created);
        const footerDate = dateObj.toLocaleString('en-US', { 
            weekday: 'long', 
            hour: 'numeric', 
            minute: 'numeric', 
            hour12: true 
        });

        let embed = {
            color: skyBlue,
            footer: { text: `📅 ${footerDate} (UTC)` },
            timestamp: dateObj
        };

        if (isRankChange && typeof log.description === 'object') {
            // --- RANK CHANGE SPECIAL FORMAT ---
            const target = log.description.target_name || "Unknown";
            const oldR = log.description.old_role_set_name || "Unknown";
            const newR = log.description.new_role_set_name || "Unknown";

            embed.title = '📋 **New Rank Change Log**';
            embed.description = [
                `*Ranked:* **${target}**`,
                `*Ranker:* **${actorName}**`,
                `*Rank Change:* **${oldR}** > **${newR}**`,
                `*Action:* \`${log.actionType}\``
            ].join('\n');
        } else {
            // --- GENERAL AUDIT LOG FORMAT ---
            let descText = "_No details available_";
            
            if (log.description) {
                // Flatten object to string if necessary to prevent Discord errors
                descText = typeof log.description === 'object' 
                    ? JSON.stringify(log.description).replace(/[{}"]/g, '').replace(/,/g, ', ') 
                    : String(log.description);
            }

            embed.title = '📋 **New Audit Log**';
            embed.description = [
                `*Actioner:* **${actorName}**`,
                `*Action:* \`${log.actionType}\``,
                `*Description:* ${descText}`
            ].join('\n');
        }

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.warn('⚠️ Discord Embed Failed:', err.message);
    }
}

module.exports = { checkAuditLogs };
