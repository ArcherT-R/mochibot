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
    .setName('blacklist-new')
    .setDescription('Blacklist a user from the group and ban them from Discord if found')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('The Roblox username to blacklist')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('Optional timeframe for the blacklist (e.g., "7 days", "permanent")')
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
    const timeframe = interaction.options.getString('timeframe') || 'Permanent';

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

      // Get user's rank in group (Group ID: 35034720 based on your bot context)
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

      // Try to find and ban the user in Discord if they're in the server
      let discordBanStatus = 'Not found in Discord';
      const guild = interaction.guild;

      // Search through server members
      try {
        await guild.members.fetch();
        const members = guild.members.cache;

        // Check if the user is linked in bot data
        let targetMember = null;
        const botData = interaction.client.botData;

        if (botData && botData.linkedUsers && botData.linkedUsers.robloxToDiscord) {
          const discordId = botData.linkedUsers.robloxToDiscord[robloxUserId.toString()];
          if (discordId) {
            targetMember = members.get(discordId);
          }
        }

        // If found, ban them
        if (targetMember) {
          await targetMember.ban({
            reason: `Blacklisted by ${interaction.user.tag} - Roblox: ${username} - Timeframe: ${timeframe}`
          });
          discordBanStatus = `✅ Banned from Discord (<@${targetMember.id}>)`;
        }
      } catch (err) {
        console.error('Error searching/banning Discord user:', err);
        discordBanStatus = '⚠️ Error checking Discord';
      }

      // Send confirmation to command user
      await interaction.editReply({
        content: `✅ **${username}** has been blacklisted.\n` +
                 `📋 Timeframe: ${timeframe}\n` +
                 `🎮 Roblox ID: ${robloxUserId}\n` +
                 `🔨 Discord Status: ${discordBanStatus}`
      });

      // Log to logging channel
      try {
        const logClient = interaction.client;
        const logGuild = await logClient.guilds.fetch(LOG_GUILD_ID);
        const logChannel = await logGuild.channels.fetch(LOG_CHANNEL_ID);

        const logEmbed = new EmbedBuilder()
          .setTitle('🚫 New Blacklist Entry')
          .setColor(0x3498db) // Light blue
          .addFields(
            { name: '👤 Username', value: `${robloxDisplayName} (@${username})`, inline: false },
            { name: '🎮 Roblox ID', value: robloxUserId.toString(), inline: true },
            { name: '👑 Rank in Group', value: userRank, inline: true },
            { name: '⏰ Timeframe', value: timeframe, inline: true },
            { name: '👮 Blacklister', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false },
            { name: '💬 Discord Status', value: discordBanStatus, inline: false }
          )
          .setTimestamp()
          .setFooter({ text: `User ID: ${robloxUserId}` });

        await logChannel.send({ embeds: [logEmbed] });
      } catch (err) {
        console.error('Failed to log blacklist:', err);
      }

    } catch (error) {
      console.error('Error in blacklist-new command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while processing the blacklist. Please try again.'
      });
    }
  }
};
