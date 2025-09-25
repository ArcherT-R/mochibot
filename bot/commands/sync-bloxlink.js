const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Syncs Discord nicknames with Roblox usernames'),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      if (!guild) return await interaction.editReply('❌ Not in a guild.');

      const channel = await guild.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      if (!channel) return await interaction.editReply('❌ Bot data channel not found.');

      // Fetch all members
      await guild.members.fetch();
      const members = guild.members.cache.filter(m => m.nickname);

      const newData = { discordToRoblox: {}, robloxToDiscord: {} };
      const debugLog = [];

      for (const member of members.values()) {
        const nick = member.nickname;
        if (!nick) continue;

        let robloxUsername;

        // Format: multi-word with (@username) or plain nickname
        const match = nick.match(/\(@(.+?)\)/);
        if (match) {
          robloxUsername = match[1];
        } else {
          robloxUsername = nick;
        }

        try {
          // Get Roblox ID from username
          const res = await axios.get(`https://api.roblox.com/users/get-by-username?username=${robloxUsername}`);
          if (res.data && res.data.Id) {
            newData.discordToRoblox[member.id] = robloxUsername;
            newData.robloxToDiscord[res.data.Id] = member.id;
            debugLog.push(`${robloxUsername} > ${res.data.Id}`);
          } else {
            debugLog.push(`❌ ${robloxUsername} not found on Roblox`);
          }
        } catch {
          debugLog.push(`❌ Failed to fetch ${robloxUsername}`);
        }
      }

      // Prepare JSON to save
      const botData = { linkedUsers: newData };
      const contentStr = JSON.stringify(botData, null, 2);

      // Split into 1950-char chunks
      const chunks = [];
      for (let i = 0; i < contentStr.length; i += 1950) {
        chunks.push(contentStr.slice(i, i + 1950));
      }

      // Delete all old messages in channel (to keep clean)
      const oldMessages = await channel.messages.fetch({ limit: 20 });
      for (const msg of oldMessages.values()) {
        await msg.delete().catch(() => {});
      }

      // Send raw JSON chunks (no markdown)
      for (const chunk of chunks) {
        await channel.send(chunk);
      }

      // Reply to user
      await interaction.editReply(
        `✅ Synced ${Object.keys(newData.robloxToDiscord).length} users.\n\nDebug:\n${debugLog.join('\n')}`
      );
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
