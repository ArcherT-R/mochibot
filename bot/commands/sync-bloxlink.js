// sync-bloxlink.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync Bloxlink users and print Roblox usernames → Discord IDs'),
  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const members = await guild.members.fetch();
    let count = 0;

    members.forEach(member => {
      const nickname = member.nickname || member.user.username;
      let robloxUsername;

      // Check if nickname has (@Username)
      const match = nickname.match(/\(@(.+)\)/);
      if (match) {
        robloxUsername = match[1]; // the part inside (@)
      } else {
        robloxUsername = nickname; // single word, treat as username
      }

      console.log(`${robloxUsername} → ${member.id}`);
      count++;
    });

    await interaction.editReply(`✅ Printed ${count} members' Roblox usernames → Discord IDs in console.`);
  }
};
