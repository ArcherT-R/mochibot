const { EmbedBuilder } = require('discord.js');

const FREE_PASS_MILESTONE = 100;

// ─────────────────────────────────────────────────────────────────────────────
//  EMBED BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildFailEmbed(expectedNumber, userId) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Fail!')
        .setDescription(
            `The next number was **${expectedNumber}**! <@${userId}> said the wrong number, ` +
            `if you have any free passes, use \`/passuse\` to use **1 pass.** ` +
            `Use \`/counting status\` to check how many you have!`
        );
}

function buildFreePassEarnedEmbed() {
    return new EmbedBuilder()
        .setColor(0x00C853)
        .setTitle('🎉 Free Pass Earned!')
        .setDescription(
            `Congrats! You've earned a free pass to use anytime you fail. ` +
            `Use \`/counting status\` to check how many you have!`
        );
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPER — ensure new fields exist on old saves
// ─────────────────────────────────────────────────────────────────────────────

function ensureGameData(game) {
    game.highestNumber  = game.highestNumber  ?? 0;
    game.topPlayers     = game.topPlayers     ?? {};
    game.freePasses     = game.freePasses     ?? {};
    game.milestoneCount = game.milestoneCount ?? {};
    game.lastFailNumber = game.lastFailNumber ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EVENT HANDLER  (replaces the old events/countingGame.js)
// ─────────────────────────────────────────────────────────────────────────────

module.exports = (client) => {
    const lastResponseSent = { messageId: null, timestamp: 0 };

    client.on('messageCreate', async message => {
        if (message.author.bot) return;
        if (!client.botData?.countingGame) return;

        const game = client.botData.countingGame;
        if (!game.channelId || message.channel.id !== game.channelId) return;

        ensureGameData(game);

        const now = Date.now();

        // Prevent duplicate responses
        if (lastResponseSent.messageId === message.id && (now - lastResponseSent.timestamp) < 2000) {
            console.log('🚫 Blocked duplicate for:', message.id);
            return;
        }

        const expectedNumber = game.currentNumber + 1;
        const userNumber     = parseInt(message.content.trim());
        const userId         = message.author.id;

        // ── FAILURE HANDLER ──────────────────────────────────────────────────
        const handleFailure = async () => {
            lastResponseSent.messageId = message.id;
            lastResponseSent.timestamp = now;

            await message.react('❌').catch(() => {});

            const failedNumber   = expectedNumber;
            game.lastFailNumber = failedNumber - 1; // restore point = last correct number
            game.currentNumber  = 0;
            game.lastUserId     = null;

            // Reset milestone progress for the user who failed
            game.milestoneCount[userId] = 0;

            client.saveBotData().catch(err => console.error("Save error:", err));

            await message.channel.send({
                embeds: [buildFailEmbed(failedNumber, userId)],
                allowedMentions: { users: [userId] }
            });
        };

        // ── VALIDATION ───────────────────────────────────────────────────────
        if (isNaN(userNumber) || userNumber !== expectedNumber) {
            return handleFailure();
        }
        if (userId === game.lastUserId) {
            return handleFailure();
        }

        // ── CORRECT COUNT ────────────────────────────────────────────────────
        lastResponseSent.messageId = message.id;
        lastResponseSent.timestamp = now;

        game.currentNumber = userNumber;
        game.lastUserId    = userId;

        // Track highest ever
        if (userNumber > game.highestNumber) {
            game.highestNumber = userNumber;
        }

        // Track per-user correct counts (for top players leaderboard)
        game.topPlayers[userId] = (game.topPlayers[userId] ?? 0) + 1;

        // Track milestone progress toward next free pass
        game.milestoneCount[userId] = (game.milestoneCount[userId] ?? 0) + 1;
        const earnedPass = game.milestoneCount[userId] % FREE_PASS_MILESTONE === 0;

        if (earnedPass) {
            game.freePasses[userId] = (game.freePasses[userId] ?? 0) + 1;
        }

        client.saveBotData().catch(err => console.error("Save error:", err));

        await message.react('✅').catch(() => {});

        if (earnedPass) {
            await message.channel.send({
                embeds: [buildFreePassEarnedEmbed()],
                allowedMentions: { users: [userId] }
            });
        }
    });
};
