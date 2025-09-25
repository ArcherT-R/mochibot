// bot/commands/linklist.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('linklist')
    .setDescription('Show all linked Discord ↔ Roblox accounts (staff only)'),

  async execute(interaction) {
    const requiredRoleId = '1363595276576620595';

    // Ensure member object is cached
    const member = interaction.member;
    if (!member) {
      return await interaction.reply({
        content: '❌ Could not fetch your member data.',
        ephemeral: true
      });
    }

    // Permission check
    if (!member.roles.cache.has(requiredRoleId)) {
      return await interaction.reply({
        content: '❌ You don’t have permission to use this command.',
        ephemeral: true
      });
    }

    // Access the persistent linked users directly
    const linkedUsers = interaction.client.botData.linkedUsers || {};
    const mappings = linkedUsers.discordToRoblox || {};

    if (Object.keys(mappings).length === 0) {
      return await interaction.reply({
        content: '💫 Data either has not been loaded, or no accounts are currently linked!',
        ephemeral: true
      });
    }

    // Build the embed
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
