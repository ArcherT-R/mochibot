const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-bloxlink')
    .setDescription('Sync Discord users linked via Bloxlink into bot data.'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    try {
      const guild = interaction.guild;
      if (!guild) return interaction.editReply('❌ Guild not found.');

      const members = await guild.members.fetch();
      console.log(`📥 Fetched ${members.size} members.`);

      const discordToRoblox = {};
      const robloxToDiscord = {};

      members.forEach(member => {
        const nick = member.nickname || member.user.username;
        let robloxUsername;

        // Check for format: DisplayName (@Username)
        const match = nick.match(/\(@(.+?)\)/);
        if (match) {
          robloxUsername = match[1];
        } else {
          robloxUsername = nick; // single word username
        }

        discordToRoblox[member.id] = robloxUsername;
        robloxToDiscord[robloxUsername] = member.id;

        console.log(`🔹 ${member.user.tag} -> ${robloxUsername}`);
      });

      const botData = { linkedUsers: { discordToRoblox, robloxToDiscord } };
      const jsonString = JSON.stringify(botData, null, 2);

      const channel = await guild.channels.fetch(process.env.BOT_DATA_CHANNEL_ID);
      if (!channel) return interaction.editReply('❌ Bot data channel not found.');

      // Split into 1500-char chunks
      const MAX_CHARS = 1500;
      const chunks = jsonString.match(/[\s\S]{1,1500}/g);

      // Fetch last message to edit
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();

      if (lastMessage) {
        await lastMessage.delete(); // delete old one
      }

      for (const chunk of chunks) {
        await channel.send(`\`\`\`json\n${chunk}\n\`\`\``);
      }

      console.log('💾 Bot data synced successfully.');
      await interaction.editReply(`✅ Synced ${members.size} members to bot data. Messages sent: ${chunks.length}`);
    } catch (err) {
      console.error('❌ Error in sync-bloxlink:', err);
      if (!interaction.replied) {
        await interaction.editReply('❌ Failed to sync bot data.');
      }
    }
  }
};

