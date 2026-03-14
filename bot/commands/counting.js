const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');

const ALLOWED_ROLE_ID = '1468537071168913500';
const FREE_PASS_MILESTONE = 100; // Every X correct counts = 1 free pass

// ─────────────────────────────────────────────────────────────────────────────
//  EMBED BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildStatusEmbed(gameData, requestingUserId) {
    const topPlayers = gameData.topPlayers ?? {};
    const sortedPlayers = Object.entries(topPlayers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const topPlayersText = sortedPlayers.length > 0
        ? sortedPlayers.map(([userId]) => `⭐️ <@${userId}>`).join('\n')
        : '*No players yet.*';

    const callerPasses = (gameData.freePasses ?? {})[requestingUserId] ?? 0;

    return new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🔥 Counting Game / Status')
        .setDescription(
            `*Current Number:* **${gameData.currentNumber}**\n` +
            `*Highest Number:* **${gameData.highestNumber ?? 0}**\n\n` +
            `*Free Passes:* **${callerPasses}**\n\n` +
            `**Top Players:**\n${topPlayersText}\n\n` +
            `*Want free resets for the event of failing? Make it ${FREE_PASS_MILESTONE} numbers counted correctly, and you get 1 free pass to use anytime!*`
        );
}

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
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensures all required fields exist on game data (safe migration for old saves).
 */
function ensureGameData(game) {
    game.highestNumber  = game.highestNumber  ?? 0;
    game.topPlayers     = game.topPlayers     ?? {};
    game.freePasses     = game.freePasses     ?? {};
    game.milestoneCount = game.milestoneCount ?? {}; // tracks progress toward next free pass per user
}

// ─────────────────────────────────────────────────────────────────────────────
//  MESSAGE CREATE EVENT HANDLER
// ─────────────────────────────────────────────────────────────────────────────

function registerMessageHandler(client) {
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
        const userNumber = parseInt(message.content.trim());
        const userId = message.author.id;

        // ── FAILURE HANDLER ──────────────────────────────────────────────────
        const handleFailure = async (reason) => {
            lastResponseSent.messageId = message.id;
            lastResponseSent.timestamp = now;

            await message.react('❌').catch(() => {});

            const failedNumber = expectedNumber;

            // Reset game state
            game.currentNumber = 0;
            game.lastUserId = null;
            // Reset this user's milestone progress on fail
            if (game.milestoneCount[userId]) {
                game.milestoneCount[userId] = 0;
            }

            client.saveBotData().catch(err => console.error("Save error:", err));

            await message.channel.send({
                embeds: [buildFailEmbed(failedNumber, userId)],
                allowedMentions: { users: [userId] }
            });
        };

        // ── VALIDATION ───────────────────────────────────────────────────────
        if (isNaN(userNumber) || userNumber !== expectedNumber) {
            return handleFailure("incorrect number or format");
        }
        if (message.author.id === game.lastUserId) {
            return handleFailure("tried to count twice in a row");
        }

        // ── CORRECT COUNT ────────────────────────────────────────────────────
        lastResponseSent.messageId = message.id;
        lastResponseSent.timestamp = now;

        game.currentNumber = userNumber;
        game.lastUserId = userId;

        // Update highest number
        if (userNumber > (game.highestNumber ?? 0)) {
            game.highestNumber = userNumber;
        }

        // Update top players (count of correct numbers per user)
        game.topPlayers[userId] = (game.topPlayers[userId] ?? 0) + 1;

        // Track milestone progress for free passes
        game.milestoneCount[userId] = (game.milestoneCount[userId] ?? 0) + 1;
        const earnedPass = game.milestoneCount[userId] > 0 && game.milestoneCount[userId] % FREE_PASS_MILESTONE === 0;

        if (earnedPass) {
            game.freePasses[userId] = (game.freePasses[userId] ?? 0) + 1;
        }

        client.saveBotData().catch(err => console.error("Save error:", err));

        await message.react('✅').catch(() => {});

        // Send free pass earned embed if milestone hit
        if (earnedPass) {
            await message.channel.send({
                embeds: [buildFreePassEarnedEmbed()],
                allowedMentions: { users: [userId] }
            });
        }
    });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SLASH COMMAND
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting')
        .setDescription('Manages the Counting game settings.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Sets up or resets the Counting channel.')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The text channel where counting will happen.')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Shows the current counting game stats.')
        ),

    // Call this once from your main bot file: require('./countingHandler').register(client)
    register: registerMessageHandler,

    async execute(interaction) {
        try {
            // Permission check
            if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                return interaction.reply({
                    content: "You need the specific staff role to use this command.",
                    ephemeral: true
                });
            }

            const client = interaction.client;
            const subcommand = interaction.options.getSubcommand();

            // ── SETUP ─────────────────────────────────────────────────────────
            if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel');

                if (!client.botData) {
                    client.botData = { linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} } };
                }

                // Preserve existing highestNumber, topPlayers, freePasses, milestoneCount on reset
                const existing = client.botData.countingGame ?? {};
                client.botData.countingGame = {
                    channelId:      channel.id,
                    currentNumber:  0,
                    lastUserId:     null,
                    highestNumber:  existing.highestNumber  ?? 0,
                    topPlayers:     existing.topPlayers     ?? {},
                    freePasses:     existing.freePasses     ?? {},
                    milestoneCount: existing.milestoneCount ?? {}
                };

                await interaction.reply({
                    content: `✅ **Counting Setup Success!**\nChannel: ${channel}\nThe next number must be **1**.`
                });

                if (typeof client.saveBotData === 'function') {
                    client.saveBotData().catch(err => console.error("Save error:", err));
                }

                return;
            }

            // ── STATUS ────────────────────────────────────────────────────────
            if (subcommand === 'status') {
                if (!client.botData?.countingGame?.channelId) {
                    return interaction.reply({
                        content: "❌ The Counting game is not set up. Use `/counting setup` first.",
                        ephemeral: true
                    });
                }

                ensureGameData(client.botData.countingGame);

                return interaction.reply({
                    embeds: [buildStatusEmbed(client.botData.countingGame, interaction.user.id)],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Counting command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
            }
        }
    }
};
