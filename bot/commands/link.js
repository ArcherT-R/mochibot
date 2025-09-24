const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Discord user to a Roblox username')
    .addUserOption(option =>
      option.setName('discord')
        .setDescription('The Discord user to link')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('roblox')
        .setDescription('The Roblox username to link')
        .setRequired(true)
    ),

  async execute(interaction) {
    const requiredRoleId = '1363595276576620595';

    try {
      // ✅ ephemeral in v14
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // Role check
      if (!interaction.member.roles.cache.has(requiredRoleId)) {
        return await interaction.editReply({
          content: '❌ You don’t have permission to use this command.'
        });
      }

      const targetUser = interaction.options.getUser('discord');
      const robloxUsername = interaction.options.getString('roblox');
      const discordId = targetUser.id;

      if (!global.linkedUsers) global.linkedUsers = {};
      if (!global.saveLinkedUsers) {
        console.error("❌ saveLinkedUsers function missing.");
        return await interaction.editReply({
          content: 'Server error, please try again later.'
        });
      }

      global.linkedUsers.discordToRoblox ??= {};
      global.linkedUsers.robloxToDiscord ??= {};

      if (global.linkedUsers.discordToRoblox[discordId]) {
        return await interaction.editReply({
          content: `❌ <@${discordId}> is already linked to **${global.linkedUsers.discordToRoblox[discordId]}**.`
        });
      }

      if (global.linkedUsers.robloxToDiscord[robloxUsername.toLowerCase()]) {
        return await interaction.editReply({
          content: `❌ The Roblox user **${robloxUsername}** is already linked to another Discord account.`
        });
      }

      // Fetch Roblox info
      let robloxId = null;
      let thumbUrl = null;
      try {
        const userRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [robloxUsername] })
        });
        const userData = await userRes.json();
        robloxId = userData.data[0]?.id;

        if (!robloxId) throw new Error('Roblox user not found');

        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`);
        const thumbData = await thumbRes.json();
        thumbUrl = thumbData.data[0]?.imageUrl;
      } catch (err) {
        console.warn("⚠️ Could not fetch Roblox avatar:", err);
      }

      // Save links
      global.linkedUsers.discordToRoblox[discordId] = robloxUsername;
      global.linkedUsers.robloxToDiscord[robloxUsername.toLowerCase()] = discordId;
      global.saveLinkedUsers();

      const embed = new EmbedBuilder()
        .setTitle('✅ Link Successful')
        .setDescription(`<@${discordId}> has been linked to **${robloxUsername}**.`)
        .setColor(0x00FF00);

      if (thumbUrl) embed.setThumbnail(thumbUrl);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error in /link command:", error);
      await interaction.editReply({
        content: '❌ An error occurred executing the command.'
      }).catch(() => {});
    }
  }
};

