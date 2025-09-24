const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const fetch = require('node-fetch');
const { loadLinkedUsers, saveLinkedUsers } = require('../../data/data');

const STAFF_ROLE_ID = '1363595276576620595';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Discord user to a Roblox username (staff only)')
    .addUserOption(opt =>
      opt.setName('discord')
        .setDescription('The Discord user to link')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('roblox')
        .setDescription('The Roblox username to link')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: InteractionResponseFlags.Ephemeral });

      // ✅ Staff check
      if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
        return interaction.editReply({ content: '❌ You do not have permission to use this command.' });
      }

      const targetUser = interaction.options.getUser('discord');
      const robloxUsername = interaction.options.getString('roblox');
      const discordId = targetUser.id;

      const linkedUsers = loadLinkedUsers();
      linkedUsers.discordToRoblox ||= {};
      linkedUsers.robloxToDiscord ||= {};

      // ✅ Prevent duplicates
      if (linkedUsers.discordToRoblox[discordId]) {
        return interaction.editReply({ content: `❌ <@${discordId}> is already linked to **${linkedUsers.discordToRoblox[discordId]}**.` });
      }

      if (linkedUsers.robloxToDiscord[robloxUsername.toLowerCase()]) {
        return interaction.editReply({ content: `❌ Roblox user **${robloxUsername}** is already linked to another Discord account.` });
      }

      // ✅ Fetch Roblox data
      let thumbUrl = null;
      try {
        const userRes = await fetch(`https://users.roblox.com/v1/usernames/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: [robloxUsername] })
        });

        const userData = await userRes.json();
        const robloxId = userData.data?.[0]?.id;
        if (!robloxId) throw new Error('Roblox user not found');

        const thumbRes = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`);
        const thumbData = await thumbRes.json();
        thumbUrl = thumbData.data?.[0]?.imageUrl || null;
      } catch (err) {
        console.warn('⚠️ Could not fetch Roblox avatar:', err);
      }

      // ✅ Save link
      linkedUsers.discordToRoblox[discordId] = robloxUsername;
      linkedUsers.robloxToDiscord[robloxUsername.toLowerCase()] = discordId;
      saveLinkedUsers(linkedUsers);

      // ✅ Build embed
      const embed = new EmbedBuilder()
        .setTitle('✅ Link Successful')
        .setDescription(`<@${discordId}> has been linked to **${robloxUsername}**.`)
        .setColor(0x00FF00);

      if (thumbUrl) embed.setThumbnail(thumbUrl);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in /link command:', error);
      await interaction.editReply({ content: '❌ An error occurred while linking.' }).catch(() => {});
    }
  }
};
