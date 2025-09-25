const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync linked users from the Bloxlink channel'),

  async execute(interaction) {
    const BOT_DATA_CHANNEL_ID = process.env.BOT_DATA_CHANNEL_ID; // where bot stores data
    const BLOXLINK_CHANNEL_ID = '1420711771747913788'; // adjust to your logs channel

    await interaction.deferReply({ ephemeral: true });

    try {
      const guild = interaction.guild;
      if (!guild) return interaction.editReply('❌ Could not find guild.');

      // Fetch channels
      const botDataChannel = await guild.channels.fetch(BOT_DATA_CHANNEL_ID);
      const bloxlinkChannel = await guild.channels.fetch(BLOXLINK_CHANNEL_ID);

      if (!botDataChannel || !bloxlinkChannel)
        return interaction.editReply('❌ Could not find one of the channels.');

      // Fetch Bloxlink messages
      const messages = await bloxlinkChannel.messages.fetch({ limit: 100 });
      const discordToRoblox = {};
      const robloxToDiscord = {};

      messages.forEach(msg => {
        // Match format: "<@DiscordID> → RobloxName"
        const match = msg.content.match(/<@!?(\d+)>\s*→\s*(\w+)/);
        if (match) {
          const discordId = match[1];
          const robloxName = match[2];
          discordToRoblox[discordId] = robloxName;
          robloxToDiscord[robloxName] = discordId;
        }
      });

      // Update client.botData
      interaction.client.botData.linkedUsers = { discordToRoblox, robloxToDiscord };

      // Save bot data
      if (interaction.client.saveBotData) await interaction.client.saveBotData();

      return interaction.editReply(`✅ Synced ${Object.keys(discordToRoblox).length} linked users from Bloxlink.`);
    } catch (err) {
      console.error('❌ Failed to sync Bloxlink:', err);
      return interaction.editReply('❌ Failed to sync Bloxlink.');
    }
  }
};
