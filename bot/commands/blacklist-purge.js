const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

// Role IDs that can use this command
const ALLOWED_ROLE_IDS = ['1378608309468401766', '1375781357460127844'];

// Channel where command can be used
const COMMAND_CHANNEL_ID = '1376129878281289769';
const COMMAND_GUILD_ID = '1362322934794031104';

// Logging channel
const LOG_CHANNEL_ID = '1427932394203250789';
const LOG_GUILD_ID = '1355538260608155698';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist-purge')
    .setDescription('Remove a user from the blacklist')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The Roblox username to remove from blacklist')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Optional reason for removing the blacklist')
        .setRequired(false)),

  async execute(interaction) {
    // Check if command is used in the correct guild
    if (interaction.guildId !== COMMAND_GUILD_ID) {
      return interaction.reply({
        content: '❌ This command can only be used in the designated server.',
        ephemeral: true
      });
    }

    // Check if command is used in the correct channel
    if (interaction.channelId !== COMMAND_CHANNEL_ID) {
      return interaction.reply({
        content: '❌ This command can only be used in <#1376129878281289769>.',
        ephemeral: true
      });
    }

    // Check if user has one of the allowed roles
    const member = interaction.member;
    const hasPermission = ALLOWED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('username');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      // Get Roblox user ID from username
      const userResponse = await axios.post('https://users.roblox.com/v1/usernames/users', {
        usernames: [username],
        excludeBannedUsers: false
      });

      if (!userResponse.data.data || userResponse.data.data.length === 0) {
        return interaction.editReply({
          content: `❌ Could not find Roblox user: **${username}**`
        });
      }

      const robloxUser = userResponse.data.data[0];
      const robloxUserId = robloxUser.id;
      const robloxDisplayName = robloxUser.displayName;

      // Get user's rank in group
      const GROUP_ID = '35034720'; // Update this to your actual group ID
      let userRank = 'Not in group';

      try {
        const rankResponse = await axios.get(`https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`);
        const groupData = rankResponse.data.data.find(g => g.group.id.toString() === GROUP_ID);
        if (groupData) {
          userRank = groupData.role.name;
        }
      } catch (err) {
        console.warn('Could not fetch group rank:', err.message);
      }

      // Send confirmation to command user
      await interaction.editReply({
        content: `✅ **${username}** has been removed from the blacklist.\n` +
                 `📋 Reason: ${reason}\n` +
                 `🎮 Roblox ID: ${robloxUserId}`
      });

      // Log to logging channel
      try {
        const logClient = interaction.client;
        const logGuild = await logClient.guilds.fetch(LOG_GUILD_ID);
        const logChannel = await logGuild.channels.fetch(LOG_CHANNEL_ID);

        const logEmbed = new EmbedBuilder()
          .setTitle('✅ Blacklist Removed')
          .setColor(0x3498db) // Light blue
          .addFields(
            { name: '👤 Username', value: `${robloxDisplayName} (@${username})`, inline: false },
            { name: '🎮 Roblox ID', value: robloxUserId.toString(), inline: true },
            { name: '👑 Rank in Group', value: userRank, inline: true },
            { name: '📝 Removal Reason', value: reason, inline: false },
            { name: '👮 Removed By', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: `User ID: ${robloxUserId}` });

        await logChannel.send({ embeds: [logEmbed] });
      } catch (err) {
        console.error('Failed to log blacklist removal:', err);
      }

    } catch (error) {
      console.error('Error in blacklist-purge command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while processing the blacklist removal. Please try again.'
      });
    }
  }
};
