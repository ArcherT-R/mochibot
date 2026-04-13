const { SlashCommandBuilder, ChannelType, EmbedBuilder } = require('discord.js');

const STAFF_ROLE_ID = [
  '1468486541172281395', 
  '1490972075077140490'
];

const FREE_PASS_MILESTONE = 50;

// Helper to ensure guild-specific data exists
function ensureGuildData(client, guildId) {
    if (!client.botData) client.botData = {};
    if (!client.botData.countingGames) client.botData.countingGames = {};
    
    if (!client.botData.countingGames[guildId]) {
        client.botData.countingGames[guildId] = {
            channelId: null,
            currentNumber: 0,
            lastUserId: null,
            highestNumber: 0,
            topPlayers: {},
            freePasses: {},
            milestoneCount: {}
        };
    }
    const game = client.botData.countingGames[guildId];
    game.highestNumber = game.highestNumber ?? 0;
    game.topPlayers = game.topPlayers ?? {};
    game.freePasses = game.freePasses ?? {};
    game.milestoneCount = game.milestoneCount ?? {};
    return game;
}

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
            `*Highest Number:* **${gameData.highestNumber}**\n\n` +
            `*Free Passes:* **${callerPasses}**\n\n` +
            `**Top Players:**\n${topPlayersText}\n\n` +
            `*Make it ${FREE_PASS_MILESTONE} numbers to earn 1 free pass!*`
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting')
        .setDescription('Manages the Counting game settings.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Sets up or resets the Counting channel for this server.')
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
                .setDescription('Shows the current counting game stats for this server.')
        ),

    async execute(interaction) {
        const client = interaction.client;
        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.reply({ content: "❌ No permission.", ephemeral: true });
            }

            const channel = interaction.options.getChannel('channel');
            ensureGuildData(client, guildId);

            client.botData.countingGames[guildId] = {
                channelId: channel.id,
                currentNumber: 0,
                lastUserId: null,
                highestNumber: client.botData.countingGames[guildId].highestNumber || 0,
                topPlayers: client.botData.countingGames[guildId].topPlayers || {},
                freePasses: client.botData.countingGames[guildId].freePasses || {},
                milestoneCount: client.botData.countingGames[guildId].milestoneCount || {}
            };

            await interaction.reply({ content: `✅ Setup Success for this server! Channel: ${channel}` });
            if (client.saveBotData) client.saveBotData();
            return;
        }

        if (subcommand === 'status') {
            const game = client.botData?.countingGames?.[guildId];
            if (!game || !game.channelId) {
                return interaction.reply({ content: "❌ Not set up here.", ephemeral: true });
            }
            return interaction.reply({ embeds: [buildStatusEmbed(game, interaction.user.id)], ephemeral: true });
        }
    }
};
