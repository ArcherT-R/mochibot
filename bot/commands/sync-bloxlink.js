// commands/sync-bloxlink.js
const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync all linked users from nicknames (RobloxDisplayName (@Username))'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const client = interaction.client;
    const guild = interaction.guild;

    if (!guild) return interaction.editReply('❌ Guild not found.');

    try {
      const members = await guild.members.fetch();
      let count = 0;

      for (const member of members.values()) {
        if (!member.nickname) continue;

        const nickname = member.nickname;
        let robloxUsername;

        // Check for format: "DisplayName (@Username)"
        const match = nickname.match(/\(@([^)]+)\)/);
        if (match) {
          robloxUsername = match[1]; // Username inside parentheses
        } else {
          robloxUsername = nickname; // Single word nickname
        }

        // Fetch Roblox ID
        let robloxId;
        try {
          const res = await axios.get(`https://api.roblox.com/users/get-by-username?username=${robloxUsername}`);
          robloxId = res.data.Id || res.data.id;
          if (!robloxId) continue; // Skip if username invalid
        } catch {
          continue; // Skip if API fails
        }

        // Update botData
        client.botData.linkedUsers.discordToRoblox[member.id] = robloxUsername;
        client.botData.linkedUsers.robloxToDiscord[robloxId] = member.id;
        count++;
      }

      // Save updated bot data
      await client.saveBotData();

      await interaction.editReply(`✅ Synced ${count} members from nicknames.`);
    } catch (err) {
      console.error('❌ /sync-bloxlink error:', err);
      await interaction.editReply('❌ Failed to sync members.');
    }
  },
};
