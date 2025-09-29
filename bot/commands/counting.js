const { SlashCommandBuilder, ChannelType } = require('discord.js');

const ALLOWED_ROLE_ID = '1363595276576620595'; // Your specified role ID

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

    async execute(interaction, client) {
        // 1. Permission Check
        if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ 
                content: "You need the specific staff role to use this command.", 
                ephemeral: true 
            });
        }
        
        const game = client.botData.countingGame;

        if (interaction.options.getSubcommand() === 'setup') {
            const channel = interaction.options.getChannel('channel');

            // Reset and save the new state
            game.channelId = channel.id;
            game.currentNumber = 0; // Reset count
            game.lastUserId = null;
            await client.saveBotData();

            await interaction.reply({ 
                content: `✅ Counting game successfully set up in ${channel} and reset to **0**. The next number must be **1**.` 
            });

        } else if (interaction.options.getSubcommand() === 'status') {
            if (!game.channelId) {
                return interaction.reply({ 
                    content: "The Counting game is not currently set up. Use `/counting setup` to start.", 
                    ephemeral: true 
                });
            }
            
            const channel = interaction.guild.channels.cache.get(game.channelId);
            const channelMention = channel ? channel.toString() : '#[channel-not-found]';

            await interaction.reply({ 
                content: `Counting is active in ${channelMention}. The current number is **${game.currentNumber}**. The next number expected is **${game.currentNumber + 1}**.`,
                ephemeral: true
            });
        }
    },
};
