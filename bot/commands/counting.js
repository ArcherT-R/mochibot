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
                    client.botData = { linkedUsers: { discordToRoblox: {}, robloxToDiscord: {} }, countingGame: { channelId: null, currentNumber: 0, lastUserId: null } };
                }
                if (!client.botData.countingGame) {
                    client.botData.countingGame = { channelId: null, currentNumber: 0, lastUserId: null };
                }
                
                // Update data
                client.botData.countingGame.channelId = channel.id;
                client.botData.countingGame.currentNumber = 0; 
                client.botData.countingGame.lastUserId = null;
                
                // Reply
                await interaction.reply({ 
                    content: `✅ **Counting Setup Success!**\nChannel: ${channel}\nThe next number must be **1**.` 
                });
                
                // Save in background
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
                const channel = interaction.guild.channels.cache.get(gameData.channelId);
                const channelMention = channel ? channel.toString() : `Unknown Channel`;
                
                return interaction.reply({ 
                    content: `**📊 Counting Game Status**\n• **Channel:** ${channelMention}\n• **Current Number:** \`${gameData.currentNumber}\`\n• **Next Expected:** \`${gameData.currentNumber + 1}\``,
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
