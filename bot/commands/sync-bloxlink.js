const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Syncs Discord nicknames with Roblox usernames')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    try {
      // Only allow role 1363595276576620595 to use command
      if (!interaction.member.roles.cache.has('1363595276576620595')) {
        return await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      if (!guild) return await interaction.editReply('❌ Not in a guild.');

      const channel = await guild.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      if (!channel) return await interaction.editReply('❌ Bot data channel not found.');

      // Fetch all members
      await guild.members.fetch();

      // Only log members with role 1361336053901824214
      const members = guild.members.cache.filter(m => m.roles.cache.has('1361336053901824214'));

      const newData = { discordToRoblox: {}, robloxToDiscord: {} };
      const debugLines = [];

      for (const member of members.values()) {
        const nick = member.nickname || member.user.username;
        if (!nick) {
          debugLines.push(`ℹ️ Skipped ${member.user.tag} (no nickname/username)`);
          continue;
        }

        // Extract Roblox username (handles both formats)
        let robloxUsername;
        const match = nick.match(/\(@\s*([^)]+?)\s*\)/);
        if (match) {
          robloxUsername = match[1].trim().replace(/^@+/, '');
        } else {
          robloxUsername = nick.trim().replace(/^@+/, '');
        }

        if (!robloxUsername) {
          debugLines.push(`ℹ️ Skipped ${member.user.tag} (no valid Roblox username)`);
          continue;
        }

        try {
          const res = await axios.get(`https://users.roblox.com/v1/users/by-username?username=${robloxUsername}`);
          if (res.data && res.data.id) {
            newData.discordToRoblox[member.id] = robloxUsername;
            newData.robloxToDiscord[res.data.id] = member.id;
            debugLines.push(`✅ Synced ${robloxUsername} (${member.user.tag}) > ${res.data.id}`);
          } else {
            debugLines.push(`❌ ${robloxUsername} not found on Roblox`);
          }
        } catch {
          debugLines.push(`❌ Failed to fetch ${robloxUsername}`);
        }
      }

      // Convert JSON to string
      const botData = { linkedUsers: newData };
      const contentStr = JSON.stringify(botData, null, 2);

      // Split into chunks ≤1950 chars
      const chunks = [];
      for (let i = 0; i < contentStr.length; i += 1950) {
        chunks.push(contentStr.slice(i, i + 1950));
      }

      // Delete old messages in bot data channel
      const messages = await channel.messages.fetch({ limit: 20 });
      for (const msg of messages.values()) {
        if (msg.author.id === guild.members.me.id) {
          await msg.delete().catch(() => {});
        }
      }

      // Send JSON in multiple plain text messages
      for (const chunk of chunks) {
        await channel.send(`\`\`\`json\n${chunk}\n\`\`\``);
      }

      // Reply small debug summary to command user
      await interaction.editReply(`✅ Synced ${Object.keys(newData.robloxToDiscord).length} users with role.\n\nDebug (first 20 lines):\n${debugLines.slice(0, 20).join('\n')}${debugLines.length > 20 ? `\n...and ${debugLines.length - 20} more.` : ''}`);
    } catch (err) {
      console.error('❌ Error in sync-bloxlink:', err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Failed to sync.', ephemeral: true });
      } else {
        await interaction.editReply('❌ Failed to sync.');
      }
    }
  },
};
