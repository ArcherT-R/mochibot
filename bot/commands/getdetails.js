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
      
      // Check if user already has a pending request
      const existingRequest = await db.getVerificationRequestByDiscordId(discordId);
      if (existingRequest && new Date(existingRequest.expires_at) > new Date()) {
        const timeLeft = Math.ceil((new Date(existingRequest.expires_at) - new Date()) / 1000 / 60);
        return await interaction.reply({
          content: `⚠️ You already have a pending verification code: \`${existingRequest.code}\`\nIt expires in ${timeLeft} minute${timeLeft !== 1 ? 's' : ''}.\n\nIf you need a new code, please wait for this one to expire.`,
          ephemeral: true
        });
      }

      // Generate 6-digit numeric code
      const code = (crypto.randomInt(0, 1_000_000) + 1_000_000).toString().slice(1); // ensures 6 digits
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save request
      await db.addVerificationRequest(discordId, code, expiresAt);

      const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

      // Create a nice embed for the response
      const embed = {
        title: '🔐 Verification Code Generated',
        description: `Your verification code is: **\`${code}\`**`,
        color: 0x00FF00,
        fields: [
          {
            name: '⏰ Expires In',
            value: '10 minutes',
            inline: true
          },
          {
            name: '🎮 How to Use',
            value: `1. Join the game: [Click Here](https://www.roblox.com/games/103428047387843/Verification)\n2. Type the code in chat\n3. Check your DMs for your password`,
            inline: false
          }
        ],
        footer: {
          text: 'Keep this code secure and do not share it with others'
        },
        timestamp: new Date().toISOString()
      };

      // Reply with embed (ephemeral)
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });

      // Log the request for debugging
      console.log(`🔐 Verification code generated for user ${interaction.user.tag} (${discordId}): ${code}`);

    } catch (err) {
      console.error('❌ getdetails error:', err);
      
      // Send error message if not already replied
      if (!interaction.replied) {
        await interaction.reply({ 
          content: '❌ Failed to create verification request. Please try again later.',
          ephemeral: true 
        });
      } else {
        // If already replied, use followUp
        await interaction.followUp({
          content: '❌ An error occurred while processing your request.',
          ephemeral: true
        });
      }
    }
  },
};
