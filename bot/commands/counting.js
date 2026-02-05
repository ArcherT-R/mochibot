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
            const client = interaction.client;
            
            // DEBUGGING - See what we're working with
            console.log('=== DEBUG START ===');
            console.log('client exists:', !!client);
            console.log('client.botData exists:', !!client.botData);
            console.log('client.botData type:', typeof client.botData);
            console.log('client.botData value:', client.botData);
            
            // 1. Permission Check
            if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                return interaction.reply({ 
                    content: "You need the specific staff role to use this command.", 
                    ephemeral: true 
                });
            }
            
            // 2. FORCED INITIALIZATION with logging
            console.log('Before initialization...');
            
            if (!client.botData) {
                console.log('client.botData was falsy, creating new object');
                client.botData = {};
            }
            
            console.log('After botData check, botData is:', client.botData);
            console.log('botData.countingGame exists:', !!client.botData.countingGame);
            
            if (!client.botData.countingGame) {
                console.log('Creating countingGame object');
                client.botData.countingGame = { 
                    channelId: null, 
                    currentNumber: 0, 
                    lastUserId: null 
                };
            }
            
            console.log('After countingGame check, countingGame is:', client.botData.countingGame);
            console.log('=== DEBUG END ===');
            
            const subcommand = interaction.options.getSubcommand();
            
            // --- SUBCOMMAND: SETUP ---
            if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel');
                
                console.log('About to set channelId on:', client.botData.countingGame);
                
                // LINE 56 - This is where it's failing
                client.botData.countingGame.channelId = channel.id;
                client.botData.countingGame.currentNumber = 0; 
                client.botData.countingGame.lastUserId = null;
                
                // Save data if the helper exists
                if (typeof client.saveBotData === 'function') {
                    try {
                        await client.saveBotData();
                    } catch (err) {
                        console.error("Save Error:", err);
                    }
                }
                
                return interaction.reply({ 
                    content: `✅ **Counting Setup Success!**\nChannel: ${channel}\nThe next number must be **1**.` 
                });
            } 
            
            // --- SUBCOMMAND: STATUS ---
            else if (subcommand === 'status') {
                const gameData = client.botData.countingGame;
                
                if (!gameData.channelId) {
                    return interaction.reply({ 
                        content: "❌ The Counting game is not set up. Use `/counting setup` first.", 
                        ephemeral: true 
                    });
                }
                
                const channel = interaction.guild.channels.cache.get(gameData.channelId);
                const channelMention = channel ? channel.toString() : `Unknown Channel`;
                
                return interaction.reply({ 
                    content: `**📊 Counting Game Status**\n• **Channel:** ${channelMention}\n• **Current Number:** \`${gameData.currentNumber}\`\n• **Next Expected:** \`${gameData.currentNumber + 1}\``,
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in counting command:', error);
            console.error('Error stack:', error.stack);
            throw error; // Re-throw so the error handler in client.js can catch it
        }
    },
};
