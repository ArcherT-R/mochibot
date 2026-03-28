// bot/commands/setinforequest.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { getRobloxId } = require('../../utils/bloxlink');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setinforequest')
    .setDescription('Get your linked Roblox account via Bloxlink.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔗 Roblox Account Lookup')
      .setDescription('Click the button below to fetch your linked Roblox account.')
      .setColor(0x0099FF);

    const button = new ButtonBuilder()
      .setCustomId('fetch_roblox')
      .setLabel('Fetch My Roblox Account')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    try {
      const buttonInteraction = await interaction.channel.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && i.customId === 'fetch_roblox',
        time: 60000
      });

      await buttonInteraction.deferUpdate();

      const robloxId = await getRobloxId(interaction.user.id);

      if (!robloxId) {
        const failEmbed = new EmbedBuilder()
          .setTitle('❌ Not Found')
          .setDescription('No Roblox account linked. Please verify with Bloxlink first.')
          .setColor(0xFF0000);

        return await interaction.editReply({ embeds: [failEmbed], components: [] });
      }

      // Fetch Roblox username + avatar
      const userRes = await fetch(`https://users.roblox.com/v1/users/${robloxId}`);
      const userData = await userRes.json();

      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`
      );
      const thumbData = await thumbRes.json();
      const thumbUrl = thumbData.data[0]?.imageUrl;

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Roblox Account Found')
        .setColor(0x00FF00)
        .addFields(
          { name: 'Roblox Username', value: userData.name ?? 'Unknown', inline: true },
          { name: 'Roblox ID', value: `${robloxId}`, inline: true }
        )
        .setFooter({ text: 'Powered by Bloxlink cache' });

      if (thumbUrl) successEmbed.setThumbnail(thumbUrl);

      await interaction.editReply({ embeds: [successEmbed], components: [] });

    } catch (err) {
      if (err.message?.includes('time')) {
        await interaction.editReply({ 
          embeds: [new EmbedBuilder().setTitle('⏱️ Timed Out').setColor(0x808080).setDescription('No response.')], 
          components: [] 
        }).catch(() => {});
      } else {
        console.error('[setinforequest] Error:', err);
      }
    }
  }
};
