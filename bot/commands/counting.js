const { SlashCommandBuilder, ChannelType } = require('discord.js');

const ALLOWED_ROLE_ID = '1468537071168913500'; 

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
        const client = interaction.client;

        // 1. Permission Check
        if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ 
                content: "You need the specific staff role to use this command.", 
                ephemeral: true 
            });
        }

        // 2. Bulletproof Safety Check
        // If botData doesn't exist at all, create it.
        if (!client.botData) {
            client.botData = {};
        }

        // If countingGame doesn't exist inside botData, create it.
        // This prevents the "Cannot set properties of undefined" error.
        if (!client.botData.countingGame) {
            client.botData.countingGame = { 
                channelId: null, 
                currentNumber: 0, 
                lastUserId: null 
            };
        }

        const game = client.botData.countingGame;
        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: SETUP ---
        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');

            // Update the data object
            game.channelId = channel.id;
            game.currentNumber = 0; 
            game.lastUserId = null;

            // Save data to your database/file if the helper function exists
            if (typeof client.saveBotData === 'function') {
                try {
                    await client.saveBotData();
                } catch (err) {
                    console.error("Failed to save bot data:", err);
                }
            }

            return interaction.reply({ 
                content: `✅ **Counting Setup Success!**\nChannel: ${channel}\nCurrent Count: **0**\nNext Number: **1**` 
            });
        } 
        
        // --- SUBCOMMAND: STATUS ---
        else if (subcommand === 'status') {
            if (!game.channelId) {
                return interaction.reply({ 
                    content: "❌ The Counting game is not set up. Use `/counting setup` first.", 
                    ephemeral: true 
                });
            }
            
            const channel = interaction.guild.channels.cache.get(game.channelId);
            const channelMention = channel ? channel.toString() : '`Unknown Channel`';

            return interaction.reply({ 
                content: `**📊 Counting Game Status**\n• **Channel:** ${channelMention}\n• **Current Number:** \`${game.currentNumber}\` \n• **Next Expected:** \`${game.currentNumber + 1}\``,
                ephemeral: true
            });
        }
    },
};
