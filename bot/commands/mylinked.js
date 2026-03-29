// bot/commands/mylinked.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getRobloxId } = require('../../utils/bloxlink');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mylinked')
    .setDescription('Check your linked Roblox account.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Check a linked Roblox account.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const staffRoleId = '1468486541172281395';
    const targetUser = interaction.options.getUser('user');

    if (targetUser && targetUser.id !== interaction.user.id && !interaction.member.roles.cache.has(staffRoleId)) {
      return await interaction.editReply({
        content: '❌ You do not have permission to look up other users.'
      });
    }

    const lookupUser = targetUser ?? interaction.user;

    try {
      const robloxId = await Promise.race([
        getRobloxId(lookupUser.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
      ]);

      if (!robloxId) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder()
            .setTitle('❌ Not Linked')
            .setDescription(`${targetUser && targetUser.id !== interaction.user.id ? `<@${lookupUser.id}> has` : 'You have'} no Roblox account linked. Please verify with Bloxlink first.`)
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

      const embed = new EmbedBuilder()
        .setTitle(targetUser && targetUser.id !== interaction.user.id ? `🔗 ${lookupUser.username}'s Linked Roblox Account` : '🔗 Your Linked Roblox Account')
        .setColor(0x0099FF)
        .addFields(
          { name: 'Discord', value: `<@${lookupUser.id}>`, inline: true },
          { name: 'Roblox Username', value: userData.name ?? 'Unknown', inline: true },
          { name: 'Roblox ID', value: `${robloxId}`, inline: true }
        )
        .setFooter({ text: 'Powered by Bloxlink cache' });

      if (thumbUrl) embed.setThumbnail(thumbUrl);

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('[mylinked]', err);
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle('❌ Error')
          .setDescription(err.message === 'timeout' ? 'Request timed out, please try again.' : 'Something went wrong.')
          .setColor(0xFF0000)
        ]
      });
    }
  }
};
