// bot/commands/linklist.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linklist')
    .setDescription('Show all linked Discord ↔ Roblox users'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: 64 }); // ephemeral reply

      if (!global.linkedUsers || !global.linkedUsers.discordToRoblox) {
        return await interaction.editReply({ content: '❌ No linked users found.' });
      }

      const entries = Object.entries(global.linkedUsers.discordToRoblox);

      if (entries.length === 0) {
        return await interaction.editReply({ content: '❌ No linked users found.' });
      }

      // Format list
      let description = entries
        .map(([discordId, robloxName]) => `• <@${discordId}> → **${robloxName}**`)
        .join('\n');

      // Avoid Discord embed limits
      if (description.length > 4000) {
        description = description.slice(0, 3997) + '...';
      }

      const embed = new EmbedBuilder()
        .setTitle('🔗 Linked Users')
        .setDescription(description)
        .setColor(0x0099ff);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error in /linklist command:", error);
      await interaction.editReply({ content: '❌ An error occurred fetching the link list.' }).catch(() => {});
    }
  }
};
