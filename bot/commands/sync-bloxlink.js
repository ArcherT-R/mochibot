const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync Bloxlink users and update bot data'),
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const members = await guild.members.fetch();

      // Prepare new linked users
      const linkedUsers = { discordToRoblox: {}, robloxToDiscord: {} };
      let count = 0;

      members.forEach(member => {
        const nickname = member.nickname || member.user.username;
        let robloxUsername;

        const match = nickname.match(/\(@(.+)\)/);
        if (match) robloxUsername = match[1];       // Extract username inside (@...)
        else robloxUsername = nickname;             // Single-word nickname fallback

        linkedUsers.discordToRoblox[member.id] = robloxUsername;
        linkedUsers.robloxToDiscord[robloxUsername] = member.id;
        count++;
        console.log(`🔹 ${member.user.tag} -> ${robloxUsername}`);
      });

      // Save to bot data channel
      const channel = await interaction.client.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      const content = JSON.stringify({ linkedUsers }, null, 2);

      if (lastMessage) await lastMessage.edit(content);
      else await channel.send(content);

      // Update in memory too
      interaction.client.botData = { linkedUsers };

      console.log('💾 Bot data updated:', linkedUsers);

      await interaction.editReply(`✅ Synced ${count} members and updated bot data.`);
    } catch (err) {
      console.error('❌ Error in sync-bloxlink:', err);
      if (interaction.deferred) {
        await interaction.editReply('❌ Failed to sync Bloxlink users.');
      } else {
        await interaction.reply({ content: '❌ Failed to sync Bloxlink users.', ephemeral: true });
      }
    }
  }
};
