// bot/commands/syncBloxlink.js
const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync linked users from Bloxlink (staff only)'),

  async execute(interaction) {
    const requiredRoleId = '1363595276576620595'; // staff
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(requiredRoleId)) {
      return interaction.editReply('❌ You don’t have permission to use this command.');
    }

    try {
      // Fetch Bloxlink verified users for your server
      const res = await fetch(`https://api.blox.link/v1/user/${interaction.guild.id}`);
      if (!res.ok) return interaction.editReply('❌ Failed to fetch data from Bloxlink.');

      const data = await res.json();
      const linkedUsers = { discordToRoblox: {}, robloxToDiscord: {} };

      for (const entry of data) {
        const discordId = entry.discordId;
        const robloxId = entry.robloxId;
        const robloxUsername = entry.username; // updated username

        linkedUsers.discordToRoblox[discordId] = robloxUsername;
        linkedUsers.robloxToDiscord[robloxId] = discordId;
      }

      // Save to bot
      interaction.client.botData.linkedUsers = linkedUsers;
      await interaction.client.saveBotData();

      interaction.editReply(`✅ Synced ${data.length} users from Bloxlink.`);
    } catch (err) {
      console.error(err);
      interaction.editReply('❌ An error occurred while syncing.');
    }
  }
};
