// commands/sync-bloxlink.js
const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch'); // make sure node-fetch is installed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync Roblox IDs from Bloxlink nicknames'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) return interaction.editReply('❌ Not in a guild.');

    const members = await guild.members.fetch();
    let syncedCount = 0;

    for (const [id, member] of members) {
      const nickname = member.nickname || member.user.username;

      // Match format: DisplayName (@Username)
      const match = nickname.match(/\(@(\w+)\)/);
      if (!match) continue;

      const robloxUsername = match[1];

      // Fetch Roblox ID
      let robloxId;
      try {
        const res = await fetch(`https://users.roblox.com/v1/users/by-username/${robloxUsername}`);
        if (!res.ok) continue;
        const data = await res.json();
        robloxId = data.id.toString();
      } catch (err) {
        console.warn(`Failed to fetch Roblox ID for ${robloxUsername}:`, err);
        continue;
      }

      // Update botData
      interaction.client.botData.linkedUsers.robloxToDiscord[robloxId] = member.id;
      interaction.client.botData.linkedUsers.discordToRoblox[member.id] = robloxId;
      syncedCount++;
    }

    // Save botData
    await interaction.client.saveBotData();

    return interaction.editReply(`✅ Synced ${syncedCount} members from Bloxlink nicknames.`);
  },
};
