const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinforequest')
    .setDescription('Post a Roblox lookup panel in this channel.'),

  async execute(interaction) {
    const requiredRoleId = '1468451671805001894';
    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔗 Roblox Account Lookup')
      .setDescription('Use the button below to link or relink your roblox ID to our services. You **must** be linked with bloxlink for this to work. This is a one-time thing, this allows you to receive discord related tags in-game.')
      .setColor(0x0099FF);

    const button = new ButtonBuilder()
      .setCustomId('fetch_roblox')
      .setLabel('Fetch My Roblox Account')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ content: '✅ Lookup panel posted!', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  }
};
