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

    // The function must be marked 'async' for 'await' to work inside it
    async execute(interaction) {
        const client = interaction.client;

        // 1. Permission Check
        if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
            return interaction.reply({ 
                content: "You need the specific staff role to use this command.", 
                ephemeral: true 
            });
        }

        // 2. Ensure botData exists
        if (!client.botData) {
            client.botData = { countingGame: { channelId: null, currentNumber: 0 } };
        }

        const game = client.botData.countingGame;
        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: SETUP ---
        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');

            // Update variables
            game.channelId = channel.id;
            game.currentNumber = 0; 

            // ✅ FIX: 'await' is used inside the async execute function
            // Only call this if you actually created the function in client.js. 
            // If not, delete this line to prevent a crash.
            if (typeof client.saveBotData === 'function') {
                await client.saveBotData(); 
            }

            return interaction.reply({
                content: `✅ **Setup Complete!**\nThe counting channel has been set to ${channel}.\nThe count has been reset to **0**.`,
                ephemeral: true
            });
        }

        // --- SUBCOMMAND: STATUS ---
        else if (subcommand === 'status') {
            if (!game.channelId) {
                return interaction.reply({
                    content: '⚠️ The counting game has not been set up yet. Run `/counting setup` first.',
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: `**📊 Counting Game Status**\n• **Channel:** <#${game.channelId}>\n• **Next Expected Number:** ${game.currentNumber + 1}`,
                ephemeral: true
            });
        }
    }, 
}; 
// ❌ Do not put any code down here (outside the brackets)
        // 2. Safety Check: Ensure botData exists
        if (!client.botData) {
            // If you missed adding botData in your main file, we can initialize a temporary one here
            // Note: This data will be lost on restart if not connected to a database
            console.warn('Warning: client.botData was missing. Initializing temporary object.');
            client.botData = { countingGame: { channelId: null, currentNumber: 0 } };
        }

        // Access the game data
        const game = client.botData.countingGame;
        const subcommand = interaction.options.getSubcommand();

        // --- SUBCOMMAND: SETUP ---
        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');

            // Update the data in memory
            game.channelId = channel.id;
            game.currentNumber = 0; // Reset count to 0 (or 1, depending on your preference)

            // TODO: If you are using a database (Mongo/SQLite), call your save function here.
            // Example: await database.saveSettings(game);

            return interaction.reply({
                content: `✅ **Setup Complete!**\nThe counting channel has been set to ${channel}.\nThe count has been reset to **0**.`,
                ephemeral: true
            });
        }

        // --- SUBCOMMAND: STATUS ---
        else if (subcommand === 'status') {
            if (!game.channelId) {
                return interaction.reply({
                    content: '⚠️ The counting game has not been set up yet. Run `/counting setup` first.',
                    ephemeral: true
                });
            }

            return interaction.reply({
                content: `**📊 Counting Game Status**\n• **Channel:** <#${game.channelId}>\n• **Next Expected Number:** ${game.currentNumber + 1}`,
                ephemeral: true
            });
        }
    },
};        if (interaction.options.getSubcommand() === 'setup') {
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
