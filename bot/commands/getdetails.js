// commands/getdetails.js
const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const db = require('../../endpoints/database'); // Adjust path if needed

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdetails')
    .setDescription('Verify in-game to receive your Roblox username & password'),

  async execute(interaction, client) {
    const discordId = interaction.user.id;

    // ----------------------------
    // 1. Get Roblox ID linked to Discord
    // ----------------------------
    const robloxId = await db.getLinkedRobloxId(discordId);
    if (!robloxId) {
      return interaction.reply({
        content: '❌ You have not linked your Roblox account. Use /link first.',
        ephemeral: true,
      });
    }

    // ----------------------------
    // 2. Generate a random 6-digit verification code
    // ----------------------------
    const code = crypto.randomInt(100000, 999999).toString();

    // ----------------------------
    // 3. Save the code in Supabase (verification_codes table)
    // ----------------------------
    try {
      await db.addVerificationCode(robloxId, code);
    } catch (err) {
      console.error('Error saving verification code:', err);
      return interaction.reply({
        content: '❌ Failed to generate verification code. Try again later.',
        ephemeral: true,
      });
    }

    // ----------------------------
    // 4. Give instructions to the user
    // ----------------------------
    const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

    await interaction.reply({
      content: `🔐 Please join the game and **say this code in chat**:\n\`\`\`${code}\`\`\`\nGame link: ${gameLink}\n\nThis code expires in 10 minutes.`,
      ephemeral: true,
    });
  },
};
