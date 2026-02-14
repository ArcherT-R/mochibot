const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setcodechannel')
        .setDescription('Locks the AI and GitHub Protocol room to this channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Hard-check for Owner ID from .env
        if (interaction.user.id !== process.env.OWNER_ID) {
            return interaction.reply({ content: "❌ Unauthorized. Only the bot owner can use this.", ephemeral: true });
        }

        const client = interaction.client;
        client.botData.codeChannelId = interaction.channelId;
        
        await client.saveBotData(); 
        await interaction.reply(`✅ AI Protocol Room successfully set to <#${interaction.channelId}>.`);
    },
};
