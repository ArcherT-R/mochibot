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

        // Format: single word or multi-word with (@username)
        const match = nick.match(/\(@(.+?)\)/);
        if (match) {
          robloxUsername = match[1]; // Text inside (@username)
        } else {
          robloxUsername = nick; // Single-word nickname is the username
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

      // Save to bot data channel in chunks
      const botData = { linkedUsers: newData };
      const contentStr = JSON.stringify(botData, null, 2);

      // Split content into 1500-char chunks
      const chunks = [];
      for (let i = 0; i < contentStr.length; i += 1500) {
        chunks.push(contentStr.slice(i, i + 1500));
      }

      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();

      if (lastMessage) {
        await lastMessage.delete(); // Remove old data
      }

      for (const chunk of chunks) {
        await channel.send(`\`\`\`json\n${chunk}\n\`\`\``);
      }

      // Reply to user
      await interaction.editReply(`✅ Synced ${Object.keys(newData.robloxToDiscord).length} users.\n\nDebug:\n${debugLog.join('\n')}`);
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
