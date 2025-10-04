// commands/getdetails.js
const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const db = require('../../endpoints/database'); // adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdetails')
    .setDescription('Request a verification code to use in-game (no Roblox link required).'),

  async execute(interaction, client) {
    try {
      const discordId = interaction.user.id;
      // generate 6-digit numeric code
      const code = (crypto.randomInt(0, 1_000_000) + 1_000_000).toString().slice(1); // ensures 6 digits
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save request
      await db.addVerificationRequest(discordId, code, expiresAt);

      const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

      // Reply once (ephemeral)
      await interaction.reply({
        content: `🔐 Your verification code: \`${code}\`\nJoin the game and type that code in chat. This code expires in 10 minutes.\nGame link: ${gameLink}`,
        ephemeral: true,
      });
    } catch (err) {
      console.error('getdetails error', err);
      if (!interaction.replied) {
        await interaction.reply({ content: '❌ Failed to create verification request.', ephemeral: true });
      }
    }
  },
};
