// commands/print-nicknames.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('print-nicknames')
    .setDescription('Prints all guild members and their nicknames to the console'),

  async execute(interaction) {
    await interaction.reply({ content: '📖 Checking nicknames...', ephemeral: true });

    const guild = interaction.guild;
    await guild.members.fetch(); // fetch all members

    console.log('--- Guild Member Nicknames ---');

    guild.members.cache.forEach(member => {
      // Use displayName to get nickname (falls back to username if no nickname)
      const nickname = member.nickname || member.user.username;
      console.log(`${member.user.tag} -> Nickname: ${nickname}`);
    });

    console.log('--- End of list ---');
    await interaction.followUp({ content: '✅ Nicknames printed to console.', ephemeral: true });
  }
};
