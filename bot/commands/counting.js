const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');
const ALLOWED_ROLE_ID = '1468486023183863869';

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
                .setDescription('Shows the current counting channel and number.')
        ),

    async execute(interaction) {
        try {
            // 1. Permission Check
            if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                return interaction.reply({
                    content: "You need the specific staff role to use this command.",
                    ephemeral: true
                });
            }

            const client = interaction.client;
            const subcommand = interaction.options.getSubcommand();

            // --- SUBCOMMAND: SETUP ---
            if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel');

                // Initialize if needed
                if (!client.botData) {
                    client.botData = {
                        linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} },
                        countingGame: {
                            channelId: null,
                            currentNumber: 0,
                            highestNumber: 0,
                            lastUserId: null,
                            topPlayers: {},   // { userId: count }
                            freePasses: {}    // { userId: count }
                        }
                    };
                }
                if (!client.botData.countingGame) {
                    client.botData.countingGame = {
                        channelId: null,
                        currentNumber: 0,
                        highestNumber: 0,
                        lastUserId: null,
                        topPlayers: {},
                        freePasses: {}
                    };
                }

                // Update data
                client.botData.countingGame.channelId = channel.id;
                client.botData.countingGame.currentNumber = 0;
                client.botData.countingGame.highestNumber = client.botData.countingGame.highestNumber ?? 0;
                client.botData.countingGame.lastUserId = null;
                client.botData.countingGame.topPlayers = client.botData.countingGame.topPlayers ?? {};
                client.botData.countingGame.freePasses = client.botData.countingGame.freePasses ?? {};

                await interaction.reply({
                    content: `✅ **Counting Setup Success!**\nChannel: ${channel}\nThe next number must be **1**.`
                });

                if (typeof client.saveBotData === 'function') {
                    client.saveBotData().catch(err => console.error("Save error:", err));
                }

                return;
            }

            // --- SUBCOMMAND: STATUS ---
            if (subcommand === 'status') {
                if (!client.botData?.countingGame?.channelId) {
                    return interaction.reply({
                        content: "❌ The Counting game is not set up. Use `/counting setup` first.",
                        ephemeral: true
                    });
                }

                const gameData = client.botData.countingGame;

                // Build top players list (top 3 by count)
                const topPlayers = gameData.topPlayers ?? {};
                const sortedPlayers = Object.entries(topPlayers)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3);

                let topPlayersText = '*No players yet.*';
                if (sortedPlayers.length > 0) {
                    topPlayersText = sortedPlayers
                        .map(([userId]) => `⭐️ <@${userId}>`)
                        .join('\n');
                }

                // Get the caller's free passes
                const callerPasses = (gameData.freePasses ?? {})[interaction.user.id] ?? 0;

                const statusEmbed = new EmbedBuilder()
                    .setColor(0xFF4500) // fiery orange-red
                    .setTitle('🔥 Counting Game / Status')
                    .setDescription(
                        `*Current Number:* **${gameData.currentNumber}**\n` +
                        `*Highest Number:* **${gameData.highestNumber ?? 0}**\n\n` +
                        `*Free Passes:* **${callerPasses}**\n\n` +
                        `**Top Players:**\n${topPlayersText}\n\n` +
                        `*Want free resets for the event of failing? Make it 100 numbers counted correctly, and you get 1 free pass to use anytime!*`
                    );

                return interaction.reply({
                    embeds: [statusEmbed],
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Counting command error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => {});
            }
        }
    },
};


// ─────────────────────────────────────────────────────────────────────────────
//  EXPORTED EMBED BUILDERS
//  Use these in your messageCreate handler (or wherever you process counting).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds the ❌ Fail embed.
 * @param {number} expectedNumber  - The number that was expected.
 * @param {string} userId          - The Discord user ID of the person who failed.
 * @returns {EmbedBuilder}
 */
function buildFailEmbed(expectedNumber, userId) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Fail!')
        .setDescription(
            `The next number was **${expectedNumber}**! <@${userId}> said the wrong number, ` +
            `if you have any free passes, use </passuse:0> to use **1 pass.** ` +
            `Use </status:0> to check how many you have!`
        );
}

/**
 * Builds the 🎉 Free Pass Earned embed.
 * @returns {EmbedBuilder}
 */
function buildFreePassEarnedEmbed() {
    return new EmbedBuilder()
        .setColor(0x00C853)
        .setTitle('🎉 Free Pass Earned!')
        .setDescription(
            `Congrats! You've earned a free pass to use anytime you fail, ` +
            `check </status:0> to check how many are left.`
        );
}

module.exports.buildFailEmbed = buildFailEmbed;
module.exports.buildFreePassEarnedEmbed = buildFreePassEarnedEmbed;
