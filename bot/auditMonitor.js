const axios = require('axios');

// Tracks the last processed log timestamp to prevent duplicates
let lastLogTimestamp = null; 

// 🛑 EDIT HERE: Add any action types you want to IGNORE
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

        if (lastLogTimestamp === null) {
            lastLogTimestamp = newestLogTime;
            console.log(`✅ [AUDIT] Monitor active. Baseline: ${logs[0].created}`);
            return;
        }

        const newLogs = logs.filter(log => new Date(log.created).getTime() > lastLogTimestamp);

        if (newLogs.length > 0) {
            newLogs.sort((a, b) => new Date(a.created) - new Date(b.created));

            let processedCount = 0;
            for (const log of newLogs) {
                if (IGNORED_ACTIONS.includes(log.actionType)) continue; 

                await sendAuditEmbed(client, channelId, log);
                processedCount++;
            }

            if (processedCount > 0) {
                console.log(`🆕 [AUDIT] Sent ${processedCount} new log(s).`);
            }
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

        const action = String(log.actionType);
        const actor = log.actor?.user?.username || "System";
        const skyBlue = 0x87CEEB;
        const zws = "\u200B"; 

        let mainSentence = "";
        let detailLine = "";
        
        let d = log.description;
        if (typeof d === 'string' && d.includes('{')) {
            try { d = JSON.parse(d); } catch (e) {}
        }

        // --- UPDATED LOGIC FOR "ASSIGN ROLE" ---
        if (action === 'Assign Role' && typeof d === 'object') {
            const target = d.TargetName || d.target_name || "Unknown User";
            const role = d.NewRoleSetName || d.RoleSetName || d.role_set_name || "a role";
            
            mainSentence = `**${actor}** assigned a role to **${target}**`;
            detailLine = `Assigned Role: **${role}**`;
        } 
        else if (action.includes('Asset') && typeof d === 'object') {
            const asset = d.AssetName || d.asset_name || "an asset";
            const version = d.VersionNumber || d.version_number || "???";
            mainSentence = `**${actor}** created version **${version}**`;
            detailLine = `of asset **${asset}**`;
        } 
        else {
            mainSentence = `**${actor}** performed: \`${action}\``;
            detailLine = d ? (typeof d === 'object' ? (d.TargetName || "Action on group") : String(d)) : "No extra details.";
        }

        const embed = {
            title: '📋 **Group Activity Log**',
            color: skyBlue,
            description: [
                mainSentence,
                detailLine,
                zws,
                `*Action:* \`${action}\`` 
            ].join('\n'),
            footer: { text: `📅 ${new Date(log.created).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}` },
            timestamp: new Date(log.created)
        };

        await channel.send({ embeds: [embed] });

    } catch (err) {
        console.warn('⚠️ Sentence Embed Failed:', err.message);
    }
}

module.exports = { checkAuditLogs };
