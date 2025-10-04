// commands/getdetails.js
const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const db = require('../../endpoints/database'); // make sure this path matches your project

module.exports = {
  data: new SlashCommandBuilder()
    .setName('getdetails')
    .setDescription('Verify in-game to receive your Roblox username & password'),

  async execute(interaction) {
    try {
      // Generate a random 6-digit code
      const code = crypto.randomInt(100000, 999999).toString();
      const discordId = interaction.user.id;

      // You need to get the roblox_id for this Discord user.
      // For now, let's assume you have a way to map Discord ID -> Roblox ID.
      // Replace this with your actual lookup:
      const roblox_id = await getRobloxIdFromDiscord(discordId);
      if (!roblox_id) {
        return interaction.reply({
          content: "❌ Could not find a linked Roblox account for your Discord user.",
          ephemeral: true,
        });
      }

      // Save the code in Supabase
      await db.addVerificationCode(roblox_id, code);

      // Game link
      const gameLink = `https://www.roblox.com/games/YOUR_PLACE_ID/Your-Game-Name`;

      await interaction.reply({
        content: `🔐 Please join the game below and **say this code in chat**:\n\`\`\`${code}\`\`\`\nGame link: ${gameLink}\n\nThis code expires in 10 minutes.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("Error in /getdetails:", err);
      interaction.reply({
        content: "❌ An error occurred while generating your verification code.",
        ephemeral: true,
      });
    }
  },
};

// Example helper function — replace with your actual Discord ↔ Roblox linking logic
async function getRobloxIdFromDiscord(discordId) {
  // e.g., query Supabase table 'linked_accounts' or your own mapping
  const { data, error } = await db.supabase
    .from('linked_accounts')
    .select('roblox_id')
    .eq('discord_id', discordId)
    .single();

  if (error || !data) return null;
  return data.roblox_id;
}
