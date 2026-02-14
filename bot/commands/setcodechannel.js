const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcodechannel')
        .setDescription('Sets the current channel as the AI Chat/Protocol room')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Only the bot owner defined in .env can use this
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: "❌ Only the bot owner can set the code channel.", ephemeral: true });
        }

        const client = interaction.client;
        client.botData.codeChannelId = interaction.channelId;
        
        await client.saveBotData(); // Persists the ID in your data channel
        await interaction.reply(`✅ AI Room set to <#${interaction.channelId}>.`);
    },
};
