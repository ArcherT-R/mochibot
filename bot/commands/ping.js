// bot/commands/ping.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),

  async execute(interaction) {
    // Reply immediately — avoids the "Unknown interaction" error
    return interaction.reply('🏓 Pong!');
  },
};
