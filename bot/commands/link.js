// bot/commands/link.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { loadLinkedUsers, saveLinkedUsers } = require('../../data/data'); // <-- adjust relative path

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
    await interaction.deferReply({ flags: 64 }); // ephemeral

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return await interaction.editReply({ content: '❌ You don’t have permission to use this command.' });
    }

    const targetUser = interaction.options.getUser('discord');
    const robloxUsername = interaction.options.getString('roblox');
    const discordId = targetUser.id;

    // Load and initialize linked users
    const linkedUsers = loadLinkedUsers();
    linkedUsers.discordToRoblox = linkedUsers.discordToRoblox || {};
    linkedUsers.robloxToDiscord = linkedUsers.robloxToDiscord || {};

    // Check existing links
    if (linkedUsers.discordToRoblox[discordId]) {
      return await interaction.editReply({
        content: `❌ <@${discordId}> is already linked to **${linkedUsers.discordToRoblox[discordId]}**.`
      });
    }
    if (linkedUsers.robloxToDiscord[robloxUsername.toLowerCase()]) {
      return await interaction.editReply({
        content: `❌ The Roblox user **${robloxUsername}** is already linked to another Discord account.`
      });
    }

    // Fetch Roblox ID + avatar
    let thumbUrl;
    try {
      const res = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [robloxUsername] })
      });
      const userData = await res.json();
      const robloxId = userData.data[0]?.id;

      if (!robloxId) throw new Error('Roblox user not found');

      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`
      );
      const thumbData = await thumbRes.json();
      thumbUrl = thumbData.data[0]?.imageUrl;
    } catch (err) {
      console.warn("⚠️ Could not fetch Roblox info:", err);
    }

    // Save link
    linkedUsers.discordToRoblox[discordId] = robloxUsername;
    linkedUsers.robloxToDiscord[robloxUsername.toLowerCase()] = discordId;
    saveLinkedUsers(linkedUsers);

    // Send embed
    const embed = new EmbedBuilder()
      .setTitle('✅ Link Successful')
      .setDescription(`<@${discordId}> has been linked to **${robloxUsername}**.`)
      .setColor(0x00FF00);

    if (thumbUrl) embed.setThumbnail(thumbUrl);

    await interaction.editReply({ embeds: [embed] });
  }
};
