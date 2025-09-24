const { SlashCommandBuilder } = require('discord.js');
const { loadLinkedUsers, saveLinkedUsers } = require('../data/data');

const STAFF_ROLE_ID = '1363595276576620595'; // Only users with this role can use /link

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Roblox username to a Discord ID (staff only)')
    .addStringOption(opt =>
      opt.setName('username')
         .setDescription('Roblox username')
         .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('discord')
         .setDescription('Discord user ID to link')
         .setRequired(true)
    ),

  async execute(interaction) {
    // Ensure user has staff role
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true
      });
    }

    const robloxUsername = interaction.options.getString('username').toLowerCase();
    const discordId = interaction.options.getString('discord');

    const linkedUsers = loadLinkedUsers();
    if (!linkedUsers.robloxToDiscord) linkedUsers.robloxToDiscord = {};

    // Save the link
    linkedUsers.robloxToDiscord[robloxUsername] = discordId;
    saveLinkedUsers(linkedUsers);

    // Reply to staff
    await interaction.reply({
      content: `✅ Linked Roblox user **${robloxUsername}** to Discord ID **${discordId}**.`,
      ephemeral: true
    });
  }
};
