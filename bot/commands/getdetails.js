const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const db = require('../../endpoints/database'); // import your DB functions

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdetails')
    .setDescription('Verify in-game to receive your Roblox username & password'),

  async execute(interaction, client) {
    try {
      const discordId = interaction.user.id;

      // Lookup linked Roblox ID
      const robloxId = await db.getLinkedRobloxId(discordId);
      if (!robloxId) {
        // Use return so nothing else executes
        return interaction.reply({
          content: '❌ Your Discord account is not linked to a Roblox account.',
          ephemeral: true, // You can change to flags if you want (see note below)
        });
      }

      // Generate a verification code
      const code = crypto.randomInt(100000, 999999).toString();

      // Store code in verification_codes table
      await db.addVerificationCode(robloxId, code);

      const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

      // Reply with the code
      return interaction.reply({
        content: `🔐 Please join the game below and **say this code in chat**:\n\`\`\`${code}\`\`\`\nGame link: ${gameLink}\n\nThis code expires in 10 minutes.`,
        ephemeral: true, // can also use flags: 64
      });
    } catch (err) {
      console.error(err);
      if (!interaction.replied) {
        return interaction.reply({
          content: '❌ An error occurred while generating your verification code.',
          ephemeral: true,
        });
      }
    }
  },
};
