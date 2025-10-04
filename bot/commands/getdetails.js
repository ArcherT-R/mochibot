const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const db = require('../../endpoints/database'); // make sure this exports addVerificationCode

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdetails')
    .setDescription('Verify in-game to receive your Roblox username & password'),

  async execute(interaction, client) {
    const code = crypto.randomInt(100000, 999999).toString();
    const discordId = interaction.user.id;

    // Save code in memory for 10 min
    client.pendingCodes = client.pendingCodes || new Map();
    client.pendingCodes.set(code, {
      discordId,
      expires: Date.now() + 10 * 60 * 1000,
    });

    // Save code in Supabase
    await db.addVerificationCode({
      code,
      discord_id: discordId,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });

    const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

    await interaction.reply({
      content: `🔐 Please join the game below and **say this code in chat**:\n\`\`\`${code}\`\`\`\nGame link: ${gameLink}\n\nThis code expires in 10 minutes.`,
      ephemeral: true,
    });
  },
};
