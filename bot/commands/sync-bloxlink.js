// sync-bloxlink.js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync Bloxlink users and update bot data'),
  async execute(interaction) {
    await interaction.deferReply();

    const guild = interaction.guild;
    const members = await guild.members.fetch();

    // Prepare bot data mappings
    const linkedUsers = { discordToRoblox: {}, robloxToDiscord: {} };
    let count = 0;

    members.forEach(member => {
      const nickname = member.nickname || member.user.username;
      let robloxUsername;

      // Check if nickname has (@Username)
      const match = nickname.match(/\(@(.+)\)/);
      if (match) {
        robloxUsername = match[1]; // the part inside (@)
      } else {
        robloxUsername = nickname; // single word, treat as username
      }

      // Save mapping
      linkedUsers.discordToRoblox[member.id] = robloxUsername;
      linkedUsers.robloxToDiscord[robloxUsername] = member.id;
      count++;
    });

    // Save to botData channel
    try {
      const channel = await interaction.client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      const content = JSON.stringify({ linkedUsers }, null, 2);

      if (lastMessage) {
        await lastMessage.edit(content);
      } else {
        await channel.send(content);
      }

      console.log('💾 Bot data updated:', linkedUsers);
      await interaction.editReply(`✅ Synced ${count} members and updated bot data.`);
    } catch (err) {
      console.error('❌ Failed to update bot data channel:', err);
      await interaction.editReply('❌ Failed to update bot data channel.');
    }
  }
};
