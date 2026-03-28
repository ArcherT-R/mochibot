// bot/commands/setinforequest.js
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require('discord.js');
const { getRobloxId } = require('../../utils/bloxlink');
const fetch = require('node-fetch');

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
    const message = await interaction.channel.send({ embeds: [embed], components: [row] });

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === 'fetch_roblox'
    });

    collector.on('collect', async (i) => {
      await i.deferReply({ ephemeral: true });

      try {
        const robloxId = await Promise.race([
          getRobloxId(i.user.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);

        if (!robloxId) {
          return await i.editReply({
            embeds: [new EmbedBuilder()
              .setTitle('❌ Not Found')
              .setDescription('No Roblox account linked. Please verify with Bloxlink first.')
              .setColor(0xFF0000)
            ]
          });
        }

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

        await i.editReply({ embeds: [successEmbed] });

      } catch (err) {
        console.error('[fetch_roblox]', err);
        await i.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Error')
            .setDescription(err.message === 'timeout' ? 'Request timed out, please try again.' : 'Something went wrong.')
            .setColor(0xFF0000)
          ]
        });
      }
    });
  }
};
