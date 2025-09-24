const { SlashCommandBuilder, InteractionResponseFlags } = require('discord.js');
const { loadLinkedUsers, saveLinkedUsers } = require('../../data/data');

const STAFF_ROLE_ID = '1363595276576620595';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link a Roblox username to a Discord ID (staff only)')
    .addStringOption(opt => opt.setName('username').setDescription('Roblox username').setRequired(true))
    .addStringOption(opt => opt.setName('discord').setDescription('Discord user ID').setRequired(true)),

  async execute(interaction) {
    // Check staff role
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        flags: InteractionResponseFlags.Ephemeral
      });
    }

    const robloxUsername = interaction.options.getString('username').toLowerCase();
    const discordId = interaction.options.getString('discord');

    // Save quickly to avoid interaction timeout
    const linkedUsers = loadLinkedUsers();
    if (!linkedUsers.robloxToDiscord) linkedUsers.robloxToDiscord = {};
    linkedUsers.robloxToDiscord[robloxUsername] = discordId;
    saveLinkedUsers(linkedUsers);

    // Reply to staff
    await interaction.reply({
      content: `✅ Linked Roblox user **${robloxUsername}** to Discord ID **${discordId}**.`,
      flags: InteractionResponseFlags.Ephemeral
    });
  }
};
