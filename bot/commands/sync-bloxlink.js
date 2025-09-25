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
        const match = nick.match(/\(@(.+?)\)/);
        robloxUsername = match ? match[1] : nick;

        try {
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

      // Prepare JSON string
      const botData = { linkedUsers: newData };
      const contentStr = JSON.stringify(botData);

      // Split into 1950-char chunks
      const chunks = [];
      for (let i = 0; i < contentStr.length; i += 1950) {
        chunks.push(contentStr.slice(i, i + 1950));
      }

      // Clear old messages first
      const messages = await channel.messages.fetch({ limit: 10 });
      for (const msg of messages.values()) {
        await msg.delete();
      }

      // Send clean raw chunks (prepend with invisible char so no embed preview)
      for (const chunk of chunks) {
        await channel.send(`\u200B${chunk}`);
      }

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
