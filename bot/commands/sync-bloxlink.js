const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync linked users from Bloxlink channel'),

  async execute(interaction) {
    await interaction.reply({ content: '🔄 Syncing...', ephemeral: true });

    const channel = await interaction.client.channels.fetch(process.env.BLOXLINK_CHANNEL_ID);
    const messages = await channel.messages.fetch({ limit: 100 });

    const discordToRoblox = {};
    const robloxToDiscord = {};

    messages.forEach(msg => {
      const match = msg.content.match(/<@!?(\d+)>\s*→\s*(\w+)/);
      if (match) {
        const discordId = match[1];
        const robloxName = match[2];
        discordToRoblox[discordId] = robloxName;
        robloxToDiscord[robloxName] = discordId;
      }
    });

    interaction.client.botData.linkedUsers = { discordToRoblox, robloxToDiscord };
    await interaction.client.saveBotData();

    await interaction.editReply({ content: `✅ Synced ${messages.size} links from Bloxlink.` });
  }
};
