const axios = require('axios');

// Tracks the last processed log timestamp to prevent duplicates
let lastLogTimestamp = null; 

// 🛑 EDIT HERE: Add any action types you want to IGNORE to this list
// This will stop the "Asset Created/Updated" spam
const IGNORED_ACTIONS = [
    'Create Asset', 
    'Update Asset', 
    'Configure Asset',
    'Create Group Asset',
    'Update Group Asset'
];

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
            
            // Sort oldest to newest for chronological Discord posting
            newLogs.sort((a, b) => new Date(a.created) - new Date(b.created));

            let processedCount = 0;

            for (const log of newLogs) {
                // 🛑 SPAM FILTER CHECK
                if (IGNORED_ACTIONS.includes(log.actionType)) {
                    // console.log(`Skipped spam log: ${log.actionType}`); // Uncomment to debug
                    continue; 
                }

                await sendAuditEmbed(client, channelId, log);
                processedCount++;
            }

            if (processedCount > 0) {
                console.log(`🆕 [AUDIT] Sent ${processedCount} new log(s).`);
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

async function sendAuditEmbed(client, channelId, log) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return;

        const action = String(log.actionType);
        const actor = log.actor?.user?.username || "System";
        const skyBlue = 0x87CEEB;
        const zws = "\u200B"; // Invisible spacer for size consistency

        // --- THE SENTENCE BUILDER ---
        let mainSentence = "";
        let detailLine = "";
        
        // Ensure description is usable
        let d = log.description;
        if (typeof d === 'string' && d.includes('{')) {
            try { d = JSON.parse(d); } catch (e) {}
        }

        if (action.includes('Rank') && typeof d === 'object') {
            // Rank Change Sentence
            mainSentence = `**${actor}** changed **${d.target_name || d.TargetName}**'s rank`;
            detailLine = `**${d.old_role_set_name || d.OldRoleSetName}** ➔ **${d.new_role_set_name || d.NewRoleSetName}**`;
        } 
        else if (action.includes('Asset') && typeof d === 'object') {
            // Asset Update Sentence
            const asset = d.AssetName || d.asset_name || "an asset";
            const version = d.VersionNumber || d.version_number || "???";
            mainSentence = `**${actor}** created new version **${version}**`;
            detailLine = `of asset **${asset}**`;
        } 
        else {
            // General Fallback
            mainSentence = `**${actor}** performed: \`${action}\``;
            detailLine = d ? (typeof d === 'object' ? (d.TargetName || "Action on group") : String(d)) : "No extra details.";
        }

        // --- EMBED CONSTRUCTION ---
        const embed = {
            title: '📋 **Group Activity Log**',
            color: skyBlue,
            description: [
                mainSentence,
                detailLine,
                zws, // Spacer line
                `*Action:* \`${action}\`` // Bottom line
            ].join('\n'),
            footer: { text: `📅 ${new Date(log.created).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: true })}` },
            timestamp: new Date(log.created)
        };

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.warn('⚠️ Sentence Embed Failed:', err.message);
    }
}

module.exports = { checkAuditLogs };
