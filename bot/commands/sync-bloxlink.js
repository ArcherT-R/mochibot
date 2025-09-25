const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync all linked users from nicknames'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;
      const members = await guild.members.fetch();

      let count = 0;

      for (const member of members.values()) {
        if (!member.nickname) continue;

        const match = member.nickname.match(/(.+)\s+\(@(.+)\)/);
        if (!match) continue;

        const robloxUsername = match[2];

        // Convert Roblox username to numeric ID
        const res = await fetch(`https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(robloxUsername)}`);
        const data = await res.json();
        if (!data.Id) continue;

        const discordId = member.id;
        const robloxId = data.Id.toString();

        // Save in botData
        interaction.client.botData.linkedUsers.discordToRoblox[discordId] = robloxId;
        interaction.client.botData.linkedUsers.robloxToDiscord[robloxId] = discordId;
        count++;
      }

      // Save persistent JSON
      await interaction.client.saveBotData();

      await interaction.editReply(`✅ Synced ${count} users from nicknames.`);
    } catch (err) {
      console.error(err);
      await interaction.editReply('❌ An error occurred while syncing.');
    }
  },
};
