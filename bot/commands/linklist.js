// bot/commands/linklist.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadLinkedUsers } = require('../../data/data'); // local JSON backup

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linklist')
    .setDescription('Show all linked Discord ↔ Roblox accounts (staff only)'),

  async execute(interaction) {
    const requiredRoleId = '1363595276576620595';

    const member = interaction.member;
    if (!member) {
      return await interaction.reply({ content: '❌ Could not fetch your member data.', ephemeral: true });
    }
    if (!member.roles.cache.has(requiredRoleId)) {
      return await interaction.reply({ content: '❌ You don’t have permission to use this command.', ephemeral: true });
    }

    // Load from memory first, fallback to JSON
    const linkedUsers = interaction.client.botData.linkedUsers || loadLinkedUsers();
    const mappings = linkedUsers.discordToRoblox || {};

    if (Object.keys(mappings).length === 0) {
      return await interaction.reply({ content: '💫 No linked users found, please check data is saved!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔗 Linked Users')
      .setColor(0x0099FF)
      .setDescription(
        Object.entries(mappings)
          .map(([discordId, robloxName]) => `👤 <@${discordId}> → **${robloxName}**`)
          .join('\n')
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
