const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const db = require('../../endpoints/database'); // <- import your database functions

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdetails')
    .setDescription('Verify in-game to receive your Roblox username & password'),

  async execute(interaction, client) {
    const discordId = interaction.user.id;

    // Lookup linked Roblox ID
    const robloxId = await db.getLinkedRobloxId(discordId);
    if (!robloxId) {
      return interaction.reply({
        content: '❌ Your Discord account is not linked to a Roblox account.',
        ephemeral: true,
      });
    }

    // Generate a verification code
    const code = crypto.randomInt(100000, 999999).toString();

    // Store code in verification_codes table
    await db.addVerificationCode(robloxId, code);

    const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

    await interaction.reply({
      content: `🔐 Please join the game below and **say this code in chat**:\n\`\`\`${code}\`\`\`\nGame link: ${gameLink}\n\nThis code expires in 10 minutes.`,
      ephemeral: true,
    });
  },
};
