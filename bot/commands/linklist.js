// bot/commands/linklist.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadLinkedUsers } = require('../../data/data'); // adjust relative path

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linklist')
    .setDescription('Show all linked Discord ↔ Roblox accounts (staff only)'),

  async execute(interaction) {
    const requiredRoleId = '1363595276576620595';
    await interaction.deferReply({ flags: 64 }); // ephemeral

    // Permission check
    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return await interaction.editReply({
        content: '❌ You don’t have permission to use this command.'
      });
    }

    const linkedUsers = loadLinkedUsers();
    const mappings = linkedUsers.discordToRoblox || {};

    if (Object.keys(mappings).length === 0) {
      return await interaction.editReply({ content: '📭 No linked users found.' });
    }

    // Build a nice embed
    const embed = new EmbedBuilder()
      .setTitle('🔗 Linked Users')
      .setColor(0x0099FF)
      .setDescription(
        Object.entries(mappings)
          .map(([discordId, robloxName]) => `👤 <@${discordId}> → **${robloxName}**`)
          .join('\n')
      );

    await interaction.editReply({ embeds: [embed] });
  }
};

